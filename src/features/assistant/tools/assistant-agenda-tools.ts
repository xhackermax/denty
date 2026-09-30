import { getBrowserApi } from "@/shared/api/browser";

import { resolveVoiceDateTime } from "./assistant-datetime";

export interface AssistantToolDeps {
  now?: () => Date;
}

export type AssistantToolHandler = (
  args: Record<string, unknown>,
  deps: Required<AssistantToolDeps>,
) => Promise<void>;

const INACTIVE_APPOINTMENT = new Set(["COMPLETED", "CANCELLED", "NO_SHOW"]);
const PENDING_LAB = new Set(["SENT", "IN_PRODUCTION", "TRIAL"]);
const DEFAULT_DURATION_MIN = 30;

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

async function patientAppointments(patientId: string) {
  const all = await getBrowserApi().appointments.list();
  return all
    .filter((item) => item.patientId === patientId && !INACTIVE_APPOINTMENT.has(item.status))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

async function todaysAppointment(patientId: string, now: Date) {
  const found = (await patientAppointments(patientId)).find((item) =>
    sameLocalDay(new Date(item.startsAt), now),
  );
  if (!found) throw new Error("No hay una cita activa hoy para este paciente.");
  return found;
}

async function findStaffId(staffRef: string): Promise<string> {
  const context = await getBrowserApi().agenda.context();
  const wanted = normalize(staffRef);
  const match = context.staff.find((staff) => normalize(staff.displayName).includes(wanted));
  if (!match) throw new Error(`No encuentro al profesional "${staffRef}" en la agenda.`);
  return match.id;
}

function spokenDateTime(args: Record<string, unknown>) {
  return {
    dateText: String(args.dateText ?? ""),
    ...(args.timeText !== undefined ? { timeText: String(args.timeText) } : {}),
  };
}

const arrive: AssistantToolHandler = async (args, { now }) => {
  const appointment = await todaysAppointment(String(args.patientId), now());
  await getBrowserApi().appointments.arrive(appointment.id, appointment.version);
};

const markNoShow: AssistantToolHandler = async (args, { now }) => {
  const appointment = await todaysAppointment(String(args.patientId), now());
  await getBrowserApi().appointments.noShow(appointment.id, appointment.version);
};

const reschedule: AssistantToolHandler = async (args, { now }) => {
  const current = now();
  const next = (await patientAppointments(String(args.patientId))).find(
    (item) => new Date(item.endsAt) >= current,
  );
  if (!next) throw new Error("No hay una cita pendiente que reagendar para este paciente.");

  const previousStart = new Date(next.startsAt);
  const previousMinutes = Math.round(
    (new Date(next.endsAt).getTime() - previousStart.getTime()) / 60_000,
  );
  const fallbackTime = `${String(previousStart.getHours()).padStart(2, "0")}:${String(previousStart.getMinutes()).padStart(2, "0")}`;
  const startsAt = resolveVoiceDateTime(spokenDateTime(args), current, fallbackTime);
  if (!startsAt) throw new Error("No he entendido la nueva fecha de la cita.");
  const minutes = args.durationMin !== undefined ? Number(args.durationMin) : previousMinutes;
  const staffId =
    args.staffRef !== undefined ? await findStaffId(String(args.staffRef)) : undefined;

  await getBrowserApi().appointments.update(next.id, {
    expectedVersion: next.version,
    ...(staffId ? { staffId } : {}),
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + minutes * 60_000).toISOString(),
  });
};

const schedule: AssistantToolHandler = async (args, { now }) => {
  const startsAt = resolveVoiceDateTime(spokenDateTime(args), now());
  if (!startsAt) throw new Error("Indica la fecha y la hora de la cita.");
  const api = getBrowserApi();
  const context = await api.agenda.context();
  const staffId =
    args.staffRef !== undefined
      ? await findStaffId(String(args.staffRef))
      : (context.actor.staffId ?? context.staff.find((staff) => staff.active !== false)?.id);
  const siteId = context.sites.find((site) => site.active !== false)?.id;
  if (!staffId || !siteId) throw new Error("No hay profesional o sede disponibles para agendar.");
  const minutes = args.durationMin !== undefined ? Number(args.durationMin) : DEFAULT_DURATION_MIN;

  await api.appointments.create({
    patientId: String(args.patientId),
    staffId,
    siteId,
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + minutes * 60_000).toISOString(),
    title: "Cita",
  });
};

const labTransition: AssistantToolHandler = async (args) => {
  const api = getBrowserApi();
  const work = (await api.laboratory.list()).items.find(
    (item) => item.patientId === String(args.patientId) && PENDING_LAB.has(item.status),
  );
  if (!work) throw new Error("No hay ningún trabajo de laboratorio pendiente para este paciente.");
  await api.laboratory.transition(work.id, {
    status: String(args.status) as "RECEIVED",
    expectedVersion: work.version,
  });
};

const addDependency: AssistantToolHandler = async (args) => {
  const api = getBrowserApi();
  const plan = await api.clinical.plan.get(String(args.patientId));
  const itemFor = (code: unknown) =>
    plan.items.find(
      (item) => item.tooth === String(args.tooth) && item.treatmentCode === String(code),
    );
  const before = itemFor(args.beforeCode);
  const after = itemFor(args.afterCode);
  if (!before || !after) {
    throw new Error(`El plan no tiene ambos tratamientos en el diente ${String(args.tooth)}.`);
  }
  await api.clinical.plan.addDependency(plan.id, { itemId: after.id, dependsOnId: before.id });
};

const prosthesisOptions: AssistantToolHandler = async (args) => {
  const teeth = (args.teeth as string[] | undefined) ?? [];
  if (!teeth.length) throw new Error("Indica los dientes para las opciones de prótesis.");
  await getBrowserApi().clinical.plan.createMissingToothAlternatives(String(args.patientId), {
    toothOrZone: teeth.join("-"),
    availableData: [],
  });
};

export const agendaToolHandlers: Record<string, AssistantToolHandler> = {
  "appointment.arrive": arrive,
  "appointment.mark_no_show": markNoShow,
  "appointment.reschedule": reschedule,
  "appointment.schedule": schedule,
  "lab.transition": labTransition,
  "clinical.add_dependency": addDependency,
  "clinical.prosthesis_options": prosthesisOptions,
};
