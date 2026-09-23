import { isAllowedDentyProxyRoute } from "../src/shared/api/proxy-policy.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`BFF policy gate: ${message}`);
}

assert(isAllowedDentyProxyRoute("GET", "/api/patients"), "GET /api/patients debe estar permitido");
assert(
  isAllowedDentyProxyRoute("PATCH", "/api/patients/patient-1"),
  "PATCH dinámico de paciente debe estar permitido",
);
assert(
  isAllowedDentyProxyRoute("POST", "/api/appointments/a1/arrive"),
  "transiciones dinámicas de agenda deben estar permitidas",
);
assert(
  isAllowedDentyProxyRoute("POST", "/api/agenda/schedule-plan-item/plan-item-1"),
  "la corrección de schedule-plan-item debe estar permitida",
);
assert(
  !isAllowedDentyProxyRoute("POST", "/api/payments/provider-webhook"),
  "el webhook de pagos nunca debe exponerse al navegador",
);
assert(
  !isAllowedDentyProxyRoute("GET", "/api/clinic/demo"),
  "la ruta demo del backend no debe exponerse al navegador",
);
assert(
  !isAllowedDentyProxyRoute("DELETE", "/api/patients/patient-1"),
  "métodos no verificados deben bloquearse",
);
assert(
  !isAllowedDentyProxyRoute("GET", "/api/not-a-real-route"),
  "rutas desconocidas deben bloquearse",
);

console.log("BFF policy gate OK");
