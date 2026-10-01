import { isProbeable, teethForChart, type MouthState } from "../odontogram/mouth-state";
import { reconcileExamMouth, type PerioExam, type PerioSite } from "./exam";
import type { PeriodontalSite } from "./index";
export type PerioOrder = "clinical" | "vestibular_first";
export type PerioFace = "vestibular" | "palatal" | "lingual";
export type PerioCommand =
  | { type: "order"; order: PerioOrder }
  | { type: "triplet" | "margin"; values: [number, number, number] }
  | { type: "bleeding" | "plaque" | "suppuration"; sites?: ("mesial" | "middle" | "distal")[] }
  | { type: "mobility" | "furcation"; value: number; entry?: "b" | "l" | "m" | "d" }
  | { type: "missing" | "implant" | "back" | "undo" }
  | { type: "goTo"; tooth: string; face?: PerioFace }
  | { type: "field"; field: "pd" | "gm" }
  | { type: "site"; tooth: string; site: PeriodontalSite; patch: Partial<PerioSite> }
  | { type: "face"; face: PerioFace };
export interface PerioCursor {
  tooth: string;
  face: PerioFace;
  field: "pd" | "gm";
  finished: boolean;
}
interface Snapshot {
  order: PerioOrder;
  exam: PerioExam;
  cursor: PerioCursor;
  lastTriplet: PerioCursor | null;
}
export interface PerioSession extends Snapshot {
  past: Snapshot[];
}
const key = (c: PerioCursor) => `${c.tooth}:${c.face}`;
const faces: PerioFace[] = ["vestibular", "palatal", "lingual", "vestibular"];
function fullPath(mouth: MouthState, order: PerioOrder = "clinical"): PerioCursor[] {
  const all = teethForChart(mouth, "perio");
  const upper = all.filter((t) => /^[1256]/.test(t));
  const lower = all.filter((t) => /^[3478]/.test(t));
  const sort = (values: string[], firstQuadrant: number) =>
    values.sort((a, b) => {
      const q = (t: string) => (Number(t[0]) > 4 ? Number(t[0]) - 4 : Number(t[0]));
      const position = (t: string) => (q(t) === firstQuadrant ? -Number(t[1]) : Number(t[1]));
      return q(a) - q(b) || position(a) - position(b);
    });
  sort(upper, 1);
  sort(lower, 3);
  const groups =
    order === "clinical"
      ? [upper, [...upper].reverse(), lower, [...lower].reverse()]
      : [upper, [...lower].reverse(), [...upper].reverse(), lower];
  const orderFaces =
    order === "clinical"
      ? faces
      : (["vestibular", "vestibular", "palatal", "lingual"] as PerioFace[]);
  return groups.flatMap((teeth, index) =>
    teeth.map((tooth) => ({
      tooth,
      face: orderFaces[index]!,
      field: "pd" as const,
      finished: false,
    })),
  );
}
export function entryPath(mouth: MouthState, order: PerioOrder = "clinical"): PerioCursor[] {
  return fullPath(mouth, order).filter((c) => isProbeable(mouth, c.tooth));
}
export function createPerioSession(
  exam: PerioExam,
  mouth: MouthState,
  order: PerioOrder = "clinical",
): PerioSession {
  return {
    order,
    exam: reconcileExamMouth(exam, mouth),
    cursor: entryPath(mouth, order)[0] ?? {
      tooth: "",
      face: "vestibular",
      field: "pd",
      finished: true,
    },
    lastTriplet: null,
    past: [],
  };
}
export function faceSites(face: PerioFace): [PeriodontalSite, PeriodontalSite, PeriodontalSite] {
  return face === "vestibular" ? ["MV", "V", "DV"] : ["MP", "P/L", "DP"];
}
function advance(
  cursor: PerioCursor,
  mouth: MouthState,
  direction: 1 | -1,
  exam: PerioExam,
  order: PerioOrder = "clinical",
): PerioCursor {
  const path = fullPath(mouth, order);
  let i = path.findIndex((c) => key(c) === key(cursor)) + direction;
  while (i >= 0 && i < path.length) {
    const candidate = path[i]!;
    if (isProbeable(mouth, candidate.tooth) && !exam.teeth[candidate.tooth]?.missing)
      return { ...candidate, field: cursor.field };
    i += direction;
  }
  return { ...cursor, finished: direction === 1 };
}
export function reconcileSessionMouth(state: PerioSession, mouth: MouthState): PerioSession {
  const exam = reconcileExamMouth(state.exam, mouth);
  return {
    ...state,
    exam,
    cursor: isProbeable(mouth, state.cursor.tooth)
      ? state.cursor
      : advance(state.cursor, mouth, 1, exam, state.order),
  };
}
const check = (value: number, min: number, max: number) => {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new RangeError(`Valor fuera de rango (${min} a ${max}). Repite.`);
};
export function applyPerioCommand(
  state: PerioSession,
  command: PerioCommand,
  mouth: MouthState,
): PerioSession {
  if (command.type === "undo") {
    const previous = state.past.at(-1);
    return previous ? { ...previous, past: state.past.slice(0, -1) } : state;
  }
  const next: PerioSession = {
    ...state,
    exam: { teeth: { ...state.exam.teeth } },
    cursor: { ...state.cursor },
    past: [
      ...state.past.slice(-29),
      {
        order: state.order,
        exam: state.exam,
        cursor: state.cursor,
        lastTriplet: state.lastTriplet,
      },
    ],
  };
  if (command.type === "order") {
    next.order = command.order;
    next.cursor = entryPath(mouth, command.order)[0] ?? { ...state.cursor, finished: true };
    next.lastTriplet = null;
    return next;
  }
  const edit = (tooth: string, site: PeriodontalSite, patch: Partial<PerioSite>) => {
    if (!isProbeable(mouth, tooth) || next.exam.teeth[tooth]?.missing)
      throw new RangeError(`El ${tooth} está ausente.`);
    const data = next.exam.teeth[tooth]!;
    next.exam.teeth[tooth] = {
      ...data,
      sites: { ...data.sites, [site]: { ...data.sites[site], ...patch } },
    };
  };
  if (command.type === "goTo" || command.type === "face") {
    const tooth = command.type === "goTo" ? command.tooth : state.cursor.tooth;
    if (!isProbeable(mouth, tooth)) throw new RangeError(`El ${tooth} está ausente.`);
    const requested = command.face ?? state.cursor.face;
    const face =
      requested === "vestibular" ? "vestibular" : /^[1256]/.test(tooth) ? "palatal" : "lingual";
    next.cursor = { tooth, face, field: state.cursor.field, finished: false };
    next.lastTriplet = null;
    return next;
  }
  if (command.type === "field") {
    next.cursor.field = command.field;
    next.lastTriplet = null;
    return next;
  }
  if (command.type === "back") {
    next.cursor = state.cursor.finished
      ? { ...state.cursor, finished: false }
      : advance(state.cursor, mouth, -1, next.exam, state.order);
    next.lastTriplet = null;
    return next;
  }
  if (command.type === "site") {
    if (command.patch.pd !== undefined && command.patch.pd !== null) check(command.patch.pd, 0, 15);
    if (command.patch.gm !== undefined && command.patch.gm !== null)
      check(command.patch.gm, -15, 5);
    edit(command.tooth, command.site, command.patch);
    return next;
  }
  if (
    !next.exam.teeth[state.cursor.tooth] ||
    (state.cursor.finished &&
      ["triplet", "mobility", "furcation", "missing", "implant"].includes(command.type))
  )
    throw new RangeError("Selecciona un diente para continuar.");
  if (command.type === "triplet" || command.type === "margin") {
    const field = command.type === "margin" ? "gm" : state.cursor.field;
    const target =
      command.type === "margin" && state.lastTriplet ? state.lastTriplet : state.cursor;
    for (const value of command.values)
      check(value, field === "pd" ? 0 : -15, field === "pd" ? 15 : 5);
    faceSites(target.face).forEach((site, index) =>
      edit(target.tooth, site, { [field]: command.values[index] }),
    );
    next.lastTriplet = { ...target, field };
    if (command.type === "triplet")
      next.cursor = advance(state.cursor, mouth, 1, next.exam, state.order);
    return next;
  }
  if (["bleeding", "plaque", "suppuration"].includes(command.type)) {
    const flags = command as Extract<PerioCommand, { type: "bleeding" | "plaque" | "suppuration" }>;
    const target = state.lastTriplet ?? state.cursor;
    const indices = { mesial: 0, middle: 1, distal: 2 };
    const sites = faceSites(target.face);
    const chosen = flags.sites?.length ? flags.sites.map((s) => sites[indices[s]]!) : sites;
    for (const site of chosen)
      edit(target.tooth, site, { [flags.type === "bleeding" ? "bop" : flags.type]: true });
    return next;
  }
  const data = next.exam.teeth[state.cursor.tooth]!;
  if (command.type === "mobility" || command.type === "furcation") {
    if (!isProbeable(mouth, state.cursor.tooth) || data.missing)
      throw new RangeError(`El ${state.cursor.tooth} está ausente.`);
    check(command.value, 0, 3);
    next.exam.teeth[state.cursor.tooth] =
      command.type === "mobility"
        ? { ...data, mobility: command.value }
        : {
            ...data,
            furcation: {
              ...data.furcation,
              [command.entry ?? (state.cursor.face === "vestibular" ? "b" : "l")]: command.value,
            },
          };
    return next;
  }
  next.exam.teeth[state.cursor.tooth] = {
    ...data,
    missing: command.type === "missing",
    implant: command.type === "implant",
  };
  if (command.type === "missing")
    next.cursor = advance(state.cursor, mouth, 1, next.exam, state.order);
  return next;
}
