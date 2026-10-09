import { describe, expect, it } from "vitest";

import {
  decideStaffRouteAccess,
  requiredPermissionForRoute,
  permissionsForRole,
  type ActorContext,
} from "../permissions";

const admin: ActorContext = {
  role: "ADMIN",
  permissions: permissionsForRole("ADMIN"),
};

const dentist: ActorContext = {
  role: "DENTIST",
  permissions: permissionsForRole("DENTIST"),
};

describe("Documentos por categorías", () => {
  it("mantiene Documentos y Consentimientos accesibles al dentista", () => {
    expect(decideStaffRouteAccess(dentist, "/app/documents").kind).toBe("allow");
    expect(decideStaffRouteAccess(dentist, "/app/documents/consentimientos").kind).toBe("allow");
  });

  it("reserva los expedientes de personal a usuarios autorizados", () => {
    expect(requiredPermissionForRoute("/app/documents/personal/curriculums")).toBe("users.manage");
    expect(requiredPermissionForRoute("/app/documents/personal/contratos")).toBe("users.manage");
    expect(decideStaffRouteAccess(dentist, "/app/documents/personal/contratos").kind).toBe("forbidden");
    expect(decideStaffRouteAccess(admin, "/app/documents/personal/contratos").kind).toBe("allow");
  });

  it("aplica permisos de finanzas y prescripción a sus archivos", () => {
    expect(requiredPermissionForRoute("/app/documents/facturas")).toBe("finance.read");
    expect(requiredPermissionForRoute("/app/documents/presupuestos")).toBe("finance.read");
    expect(requiredPermissionForRoute("/app/documents/recetas")).toBe("prescription.read");
  });

  it("nunca permite acceso a personal desde una sesión de paciente", () => {
    const patient: ActorContext = {
      role: "PATIENT",
      permissions: permissionsForRole("PATIENT"),
    };
    expect(decideStaffRouteAccess(patient, "/app/documents/personal/contratos").kind).toBe("forbidden");
  });
});
