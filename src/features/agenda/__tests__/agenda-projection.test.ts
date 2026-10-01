import { describe, expect, it } from "vitest";
import type { Appointment } from "@/shared/api";
import { projectApiAppointments } from "../agenda-projection";

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appointment",
    clinicId: "clinic",
    patientId: "patient",
    staffId: "staff",
    siteId: "site",
    startsAt: "2026-10-01T10:00:00+02:00",
    endsAt: "2026-10-01T10:30:00+02:00",
    status: "PLANNED",
    version: 1,
    title: "Cita",
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z",
    ...overrides,
  };
}

describe("proyección clínica de las citas", () => {
  it("usa el plan en vez de inferir otros tratamientos del motivo", () => {
    const views = projectApiAppointments(
      [
        appointment({
          reason: "Comentar implante 46",
          clinical: {
            tooth: "26",
            treatmentCode: "FILLING",
            label: "Obturación MOD 26",
            surfaces: ["M", "O", "D"],
            clinicalStatus: "filling_bad",
            planStatus: "PLANNED",
          },
        }),
      ],
      [],
    );
    expect(views[0]?.glyphs).toHaveLength(1);
    expect(views[0]?.glyph).toMatchObject({
      family: "restorative_surface",
      location: "26",
      clinicalState: "redo",
    });
  });
  it("mantiene una urgencia del motivo sin cambiar el tratamiento vinculado", () => {
    const views = projectApiAppointments(
      [
        appointment({
          reason: "Urgencia por dolor agudo",
          clinical: {
            tooth: "46",
            treatmentCode: "ENDO",
            label: "Endodoncia",
          },
        }),
      ],
      [],
    );
    expect(views[0]?.glyph).toMatchObject({ family: "endodontics", location: "46", urgent: true });
  });
  it("conserva una cita histórica pero no dibuja trabajo terminado como pendiente", () => {
    const views = projectApiAppointments(
      [appointment({ status: "COMPLETED", reason: "Corona 16" })],
      [],
    );
    expect(views).toHaveLength(1);
    expect(views[0]?.glyphs).toEqual([]);
  });
  it("un plan terminado no se vuelve pendiente al mantener la cita", () => {
    const views = projectApiAppointments(
      [appointment({ clinical: { label: "Corona 16", planStatus: "COMPLETED" } })],
      [],
    );
    expect(views[0]?.glyphs).toEqual([]);
  });
  it("separa tratamientos explícitos sin truncar el motivo completo", () => {
    const reason = "Implante 46; Corona 11; Raspado Q1; Extracción 28";
    const views = projectApiAppointments([appointment({ reason })], []);
    expect(views[0]?.glyphs).toHaveLength(4);
    expect(views[0]?.reason).toBe(reason);
  });
});
