import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const checks = [
  [
    "src/features/portal/patient-portal.tsx",
    "Tu tratamiento, citas, dinero y decisiones en un solo recorrido.",
  ],
  ["src/features/portal/patient-portal.tsx", "Pagos y presupuestos"],
  ["src/features/portal/patient-portal.tsx", "Ayuda y cambios médicos"],
  ["src/features/portal/patient-portal.tsx", "Privacidad y acceso familiar"],
  [
    "src/features/patients/patients-page.tsx",
    "Busca, abre y gestiona fichas sin salir del flujo clínico.",
  ],
  ["src/features/patients/patient-profile.tsx", "Consentimientos y documentos"],
  ["src/shared/clinical/clinical-sync-card.tsx", "Sincronización clínica"],
  ["src/shared/clinical/clinical-workspace.tsx", "Presupuesto desde plan"],
  ["src/shared/clinical/clinical-workspace.tsx", "Plan por fases"],
  ["src/features/parity/tasks-page.tsx", "Tareas de clínica"],
  [
    "src/features/parity/tasks-page.tsx",
    "Crear paciente, cobrar, dar cita y recibir laboratorio desde una sola pantalla.",
  ],
  ["src/features/parity/modules/laboratory-module.tsx", "Nuevo trabajo de laboratorio"],
  ["src/features/parity/modules/communications-module.tsx", "Consentimiento de marketing vigente"],
  [
    "src/features/parity/module-workbench.tsx",
    "Trabajos, estados, entregas, repeticiones y recepción de laboratorio.",
  ],
  [
    "src/features/parity/module-workbench.tsx",
    "Producción, facturación, cobros, pendientes, series y rectificativas.",
  ],
  [
    "src/features/parity/module-workbench.tsx",
    "Centro de atención clínica, operativa, financiera y de seguridad.",
  ],
  [
    "src/features/parity/module-workbench.tsx",
    "Usuarios, privacidad, copias, sesiones, receta, marketing y apariencia.",
  ],
  [
    "src/features/agenda/agenda-page.tsx",
    "Tu día clínico. Arrastra una cita para moverla y usa ··· para lo demás.",
  ],
  [
    "src/features/odontogram/odontogram-workspace.tsx",
    "5 caras, estados clínicos, plantillas e historial compartido con voz.",
  ],
  ["src/features/patients/patient-clinical-summary.tsx", "No se pudo cargar la historia clínica"],
  ["src/features/agenda/agenda-page.tsx", "Agenda operativa"],
  ["src/features/agenda/agenda-page.tsx", "No se pudo cargar la agenda real"],
  ["src/features/odontogram/odontogram-workspace.tsx", "Odontograma clínico"],
  ["src/features/odontogram/odontogram-workspace.tsx", "Herramientas avanzadas"],
  ["src/features/odontogram/odontogram-workspace.tsx", "Herramientas clínicas"],
  ["src/features/odontogram/odontogram-workspace.tsx", "Diente seleccionado"],
  ["src/features/odontogram/odontogram-history.tsx", "Historial del odontograma"],
  ["src/features/odontogram/periodontal-quick-entry.tsx", "Registro periodontal rápido"],
  ["src/features/parity/modules/documents-module.tsx", "Consentimientos firmados"],
  ["src/features/parity/modules/documents-module.tsx", "Todavía no hay consentimientos firmados"],
  ["src/features/parity/modules/documents-module.tsx", "Documentos pendientes"],
  ["src/features/parity/modules/documents-module.tsx", "Odontólogo responsable"],
  ["src/features/parity/modules/documents-module.tsx", "Firma del consentimiento"],
  ["src/features/parity/modules/documents-module.tsx", "Odontólogo que realiza / autoriza"],
  ["src/features/parity/modules/documents-module.tsx", "Sede donde se realiza"],
  ["src/features/parity/modules/documents-module.tsx", "Copia clínica firmada"],
  ["src/features/parity/modules/documents-module.tsx", "Contenido del consentimiento utilizado"],
  ["src/features/parity/modules/settings-module.tsx", "Privacidad y derechos del paciente"],
  ["src/features/parity/modules/settings-module.tsx", "Odontólogo habilitado para prescripción"],
  ["src/features/parity/modules/settings-module.tsx", "Recepción puede preparar borradores"],
  ["messages/es.json", "Gestión clínica dental"],
  ["messages/es.json", "MODO DEMOSTRACIÓN — datos ficticios"],
  ["messages/es.json", "Denty V3 · paridad funcional 2.3.7"],
  [
    "messages/es.json",
    "Denty prioriza lo que necesita atención y recupera el flujo operativo original sobre la arquitectura V3.",
  ],
  [
    "messages/es.json",
    "La autenticación real se migra en F4. Esta pantalla valida el layout público y el sistema de diseño.",
  ],
  ["messages/es.json", "Vista estructural de F2. No autentica todavía."],
  [
    "messages/es.json",
    "Layout aislado del área clínica profesional. La funcionalidad del portal se migra en F10.",
  ],
  ["messages/es.json", "Migración funcional pendiente de su fase correspondiente."],
];

const failures = [];
for (const [file, phrase] of checks) {
  const text = readFileSync(resolve(file), "utf8");
  if (text.includes(phrase)) failures.push(`${file}: ${phrase}`);
}

if (failures.length) {
  console.error(
    "Microcopy todavía demasiado larga o redundante:\n" + failures.map((x) => `- ${x}`).join("\n"),
  );
  process.exit(1);
}
console.log(`Microcopy check OK (${checks.length} reglas)`);
