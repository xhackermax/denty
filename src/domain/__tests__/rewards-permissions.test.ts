import { describe, expect, it } from "vitest";
import {
  can,
  canAccessAppointment,
  canAccessPatient,
  decideStaffRouteAccess,
  normalizeRole,
  permissionsForRole,
  requiredPermissionForRoute,
  type ActorContext,
} from "../permissions";
import { patientLabel, rewardCents } from "../rewards";

describe("rewards", () => {
  it.each([
    [0, 0],
    [2, 0],
    [3, 100],
    [14, 400],
    [15, 500],
    [16, 500],
  ])("rewardCents(%s) = %s", (games, cents) => {
    expect(rewardCents(games)).toBe(cents);
  });

  it("anonimiza el ranking con los cuatro últimos dígitos", () => {
    expect(patientLabel("00123456")).toBe("Ficha ••3456");
  });
});

describe("permissions", () => {
  const dentist: ActorContext = {
    role: "DENTIST",
    permissions: ["patients.read", "agenda.read.own"],
    staffId: "dentist-1",
  };

  it("agenda.read acepta all u own", () => {
    expect(can(dentist, "agenda.read")).toBe(true);
  });

  it("agenda propia no expone citas de otro profesional", () => {
    expect(canAccessAppointment(dentist, { staffId: "dentist-1" })).toBe(true);
    expect(canAccessAppointment(dentist, { staffId: "dentist-2" })).toBe(false);
  });

  it("PATIENT solo accede a ids concedidos", () => {
    const patient: ActorContext = {
      role: "PATIENT",
      permissions: ["documents.read"],
      patientIds: ["self", "child"],
    };
    expect(canAccessPatient(patient, "child")).toBe(true);
    expect(canAccessPatient(patient, "other")).toBe(false);
  });

  it("recupera ASSISTANT y aliases históricos de recepción", () => {
    expect(normalizeRole("assistant")).toBe("ASSISTANT");
    expect(normalizeRole("secretaria")).toBe("RECEPTION");
    expect(permissionsForRole("ASSISTANT")).toContain("clinical.read");
    expect(permissionsForRole("ASSISTANT")).not.toContain("clinical.write");
  });

  it("protege administración con users.manage", () => {
    expect(requiredPermissionForRoute("/app/admin/users")).toBe("users.manage");
  });

  it("aplica el guard de staff sin crear una segunda matriz de permisos", () => {
    const assistant: ActorContext = {
      role: "ASSISTANT",
      permissions: permissionsForRole("ASSISTANT"),
    };
    const patient: ActorContext = {
      role: "PATIENT",
      permissions: permissionsForRole("PATIENT"),
    };

    expect(decideStaffRouteAccess(assistant, "/app/patients")).toEqual({
      kind: "allow",
    });
    expect(decideStaffRouteAccess(assistant, "/app/admin")).toEqual({
      kind: "forbidden",
      required: "users.manage",
    });
    expect(decideStaffRouteAccess(patient, "/app")).toEqual({
      kind: "forbidden",
      required: "staff",
    });
    expect(decideStaffRouteAccess(null, "/app/patients")).toEqual({
      kind: "unauthenticated",
    });
  });

  it("resuelve permisos también para subrutas y query strings", () => {
    expect(requiredPermissionForRoute("/app/patients/p-1?panel=odontogram")).toBe("patients.read");
    expect(requiredPermissionForRoute("/app/agenda/day/2026-09-21")).toBe("agenda.read");
    expect(requiredPermissionForRoute("/patient/p-1")).toBeNull();
  });
});
