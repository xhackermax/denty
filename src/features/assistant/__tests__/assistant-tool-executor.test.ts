import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  appointments: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    arrive: vi.fn(),
    noShow: vi.fn(),
  },
  agenda: { context: vi.fn() },
  laboratory: { list: vi.fn(), transition: vi.fn() },
  clinical: {
    plan: {
      get: vi.fn(),
      addItem: vi.fn(),
      addDependency: vi.fn(),
      createMissingToothAlternatives: vi.fn(),
    },
  },
}));

vi.mock("@/shared/api/browser", () => ({ getBrowserApi: () => api }));

import type { AssistantToolCall } from "../assistant-types";
import { executeAssistantCalls, executeAssistantTool } from "../tools/assistant-tool-executor";

const now = () => new Date(2026, 8, 30, 9, 0, 0);
const call = (name: string, args: Record<string, unknown>): AssistantToolCall => ({
  id: `c-${name}`,
  name,
  args,
  source: "LOCAL_NLU",
});

const appt = (over: Record<string, unknown> = {}) => ({
  id: "a1",
  patientId: "p1",
  staffId: "s1",
  siteId: "site1",
  status: "PLANNED",
  version: 3,
  startsAt: new Date(2026, 8, 30, 11, 0).toISOString(),
  endsAt: new Date(2026, 8, 30, 11, 30).toISOString(),
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("navigation.open", () => {
  it("opens the odontogram of the open patient", async () => {
    await expect(
      executeAssistantTool(call("navigation.open", { destination: "odontogram", patientId: "p9" })),
    ).resolves.toEqual({ type: "NAVIGATE", href: "/app/patients/p9/odontogram" });
  });

  it("falls back to the patient list without an open patient", async () => {
    await expect(
      executeAssistantTool(call("navigation.open", { destination: "odontogram" })),
    ).resolves.toEqual({ type: "NAVIGATE", href: "/app/patients" });
  });
});

describe("appointment tools", () => {
  it("marks arrival on today's active appointment", async () => {
    api.appointments.list.mockResolvedValue([appt({ id: "old", status: "COMPLETED" }), appt()]);
    await executeAssistantTool(call("appointment.arrive", { patientId: "p1" }), { now });
    expect(api.appointments.arrive).toHaveBeenCalledWith("a1", 3);
  });

  it("marks a no-show", async () => {
    api.appointments.list.mockResolvedValue([appt()]);
    await executeAssistantTool(call("appointment.mark_no_show", { patientId: "p1" }), { now });
    expect(api.appointments.noShow).toHaveBeenCalledWith("a1", 3);
  });

  it("explains when there is no appointment today", async () => {
    api.appointments.list.mockResolvedValue([]);
    await expect(
      executeAssistantTool(call("appointment.mark_no_show", { patientId: "p1" }), { now }),
    ).rejects.toThrow(/no hay una cita/i);
  });

  it("reschedules the next appointment keeping its duration and staff", async () => {
    api.appointments.list.mockResolvedValue([appt()]);
    await executeAssistantTool(
      call("appointment.reschedule", { patientId: "p1", dateText: "mañana", timeText: "10:30" }),
      { now },
    );
    expect(api.appointments.update).toHaveBeenCalledWith("a1", {
      expectedVersion: 3,
      startsAt: new Date(2026, 9, 1, 10, 30).toISOString(),
      endsAt: new Date(2026, 9, 1, 11, 0).toISOString(),
    });
  });

  it("reschedules to the requested staff member and duration", async () => {
    api.appointments.list.mockResolvedValue([appt()]);
    api.agenda.context.mockResolvedValue({
      staff: [
        { id: "s1", displayName: "Dr. Pérez" },
        { id: "s2", displayName: "Dra. Ruiz" },
      ],
      sites: [],
      actor: { role: "RECEPTION" },
    });
    await executeAssistantTool(
      call("appointment.reschedule", {
        patientId: "p1",
        dateText: "mañana",
        timeText: "10:30",
        durationMin: 45,
        staffRef: "Ruiz",
      }),
      { now },
    );
    expect(api.appointments.update).toHaveBeenCalledWith("a1", {
      expectedVersion: 3,
      staffId: "s2",
      startsAt: new Date(2026, 9, 1, 10, 30).toISOString(),
      endsAt: new Date(2026, 9, 1, 11, 15).toISOString(),
    });
  });

  it("fails readably when the staff member is unknown", async () => {
    api.appointments.list.mockResolvedValue([appt()]);
    api.agenda.context.mockResolvedValue({ staff: [], sites: [], actor: { role: "RECEPTION" } });
    await expect(
      executeAssistantTool(
        call("appointment.reschedule", { patientId: "p1", dateText: "hoy", staffRef: "Nadie" }),
        { now },
      ),
    ).rejects.toThrow(/Nadie/);
  });

  it("schedules a new appointment with the actor's staff and first site", async () => {
    api.agenda.context.mockResolvedValue({
      staff: [{ id: "s1", displayName: "Dr. Pérez", active: true }],
      sites: [{ id: "site1", name: "Centro", cabinets: [] }],
      actor: { role: "RECEPTION", staffId: "s1" },
    });
    await executeAssistantTool(
      call("appointment.schedule", { patientId: "p1", dateText: "lunes", timeText: "12:00" }),
      { now },
    );
    expect(api.appointments.create).toHaveBeenCalledWith({
      patientId: "p1",
      staffId: "s1",
      siteId: "site1",
      startsAt: new Date(2026, 9, 5, 12, 0).toISOString(),
      endsAt: new Date(2026, 9, 5, 12, 30).toISOString(),
      title: "Cita",
    });
  });

  it("requires a time to schedule", async () => {
    await expect(
      executeAssistantTool(call("appointment.schedule", { patientId: "p1", dateText: "lunes" }), {
        now,
      }),
    ).rejects.toThrow(/hora/i);
  });
});

describe("lab.transition", () => {
  it("marks the patient's pending work as received", async () => {
    api.laboratory.list.mockResolvedValue({
      items: [
        { id: "l0", patientId: "p1", status: "PLACED", version: 1 },
        { id: "l1", patientId: "p1", status: "SENT", version: 4 },
        { id: "l2", patientId: "p2", status: "SENT", version: 1 },
      ],
    });
    await executeAssistantTool(call("lab.transition", { patientId: "p1", status: "RECEIVED" }));
    expect(api.laboratory.transition).toHaveBeenCalledWith("l1", {
      status: "RECEIVED",
      expectedVersion: 4,
    });
  });

  it("fails readably without pending work", async () => {
    api.laboratory.list.mockResolvedValue({ items: [] });
    await expect(
      executeAssistantTool(call("lab.transition", { patientId: "p1", status: "RECEIVED" })),
    ).rejects.toThrow(/trabajo de laboratorio/i);
  });
});

describe("clinical plan tools", () => {
  it("adds a dependency between two plan items of the tooth", async () => {
    api.clinical.plan.get.mockResolvedValue({
      id: "plan1",
      items: [
        { id: "i1", tooth: "14", treatmentCode: "endodontics" },
        { id: "i2", tooth: "14", treatmentCode: "crown" },
        { id: "i3", tooth: "15", treatmentCode: "crown" },
      ],
    });
    await executeAssistantTool(
      call("clinical.add_dependency", {
        patientId: "p1",
        tooth: "14",
        beforeCode: "endodontics",
        afterCode: "crown",
      }),
    );
    expect(api.clinical.plan.addDependency).toHaveBeenCalledWith("plan1", {
      itemId: "i2",
      dependsOnId: "i1",
    });
  });

  it("fails readably when a plan item is missing", async () => {
    api.clinical.plan.get.mockResolvedValue({ id: "plan1", items: [] });
    await expect(
      executeAssistantTool(
        call("clinical.add_dependency", {
          patientId: "p1",
          tooth: "14",
          beforeCode: "endodontics",
          afterCode: "crown",
        }),
      ),
    ).rejects.toThrow(/plan/i);
  });

  it("creates prosthesis alternatives for missing teeth", async () => {
    await executeAssistantTool(
      call("clinical.prosthesis_options", { patientId: "p1", teeth: ["14", "15"] }),
    );
    expect(api.clinical.plan.createMissingToothAlternatives).toHaveBeenCalledWith("p1", {
      toothOrZone: "14-15",
      availableData: [],
    });
  });
});

describe("clinical.plan_item", () => {
  it("adds a catalog treatment to the plan without a tooth", async () => {
    await executeAssistantTool(
      call("clinical.plan_item", {
        patientId: "p1",
        treatmentCode: "WHITENING",
        label: "Blanqueamiento",
        adHoc: false,
      }),
    );

    expect(api.clinical.plan.addItem).toHaveBeenCalledWith("p1", {
      treatmentCode: "WHITENING",
      label: "Blanqueamiento",
      adHoc: false,
    });
  });

  it("adds an ad hoc treatment on a tooth", async () => {
    await executeAssistantTool(
      call("clinical.plan_item", {
        patientId: "p1",
        tooth: "11",
        treatmentCode: "VENEER",
        label: "Carilla 11",
        adHoc: true,
      }),
    );

    expect(api.clinical.plan.addItem).toHaveBeenCalledWith("p1", {
      tooth: "11",
      treatmentCode: "VENEER",
      label: "Carilla 11",
      adHoc: true,
    });
  });
});

describe("executeAssistantCalls", () => {
  it("keeps a readable reason for failed calls and throws when nothing ran", async () => {
    api.appointments.list.mockResolvedValue([]);
    await expect(
      executeAssistantCalls([call("appointment.mark_no_show", { patientId: "p1" })], {
        confirmedCallIds: new Set(["c-appointment.mark_no_show"]),
      }),
    ).rejects.toThrow(/no hay una cita/i);
  });

  it("reports failures alongside successes", async () => {
    api.appointments.list.mockResolvedValue([]);
    const result = await executeAssistantCalls(
      [
        call("navigation.open", { destination: "agenda" }),
        call("appointment.mark_no_show", { patientId: "p1" }),
      ],
      { confirmedCallIds: new Set(["c-appointment.mark_no_show"]) },
    );
    expect(result.executed).toEqual(["navigation.open"]);
    expect(result.skipped).toEqual(["appointment.mark_no_show"]);
    expect(result.failures?.[0]).toMatchObject({ name: "appointment.mark_no_show" });
    expect(result.failures?.[0]?.message).toMatch(/no hay una cita/i);
  });

  it("does not execute RED calls without confirmation", async () => {
    const result = await executeAssistantCalls([call("appointment.arrive", { patientId: "p1" })], {
      confirmedCallIds: new Set(),
    });
    expect(result.pendingConfirmation?.name).toBe("appointment.arrive");
    expect(api.appointments.list).not.toHaveBeenCalled();
  });
});
