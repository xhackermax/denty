import type { AssistantRisk } from "../assistant-types";

export interface AssistantToolDefinition {
  name: string;
  risk: AssistantRisk;
  description: string;
  requiresPatient: boolean;
}

const definitions: AssistantToolDefinition[] = [
  {
    name: "navigation.open",
    risk: "GREEN",
    description: "Abrir una sección de Denty",
    requiresPatient: false,
  },
  {
    name: "navigation.patient",
    risk: "GREEN",
    description: "Abrir la ficha de un paciente",
    requiresPatient: true,
  },
  {
    name: "odontogram.select_tooth",
    risk: "GREEN",
    description: "Seleccionar un diente",
    requiresPatient: false,
  },
  {
    name: "odontogram.set_state",
    risk: "YELLOW",
    description: "Modificar el odontograma",
    requiresPatient: true,
  },
  {
    name: "odontogram.bridge",
    risk: "YELLOW",
    description: "Registrar un puente",
    requiresPatient: true,
  },
  {
    name: "odontogram.removable",
    risk: "YELLOW",
    description: "Registrar prótesis removible",
    requiresPatient: true,
  },
  {
    name: "periodontal.update",
    risk: "YELLOW",
    description: "Actualizar periodoncia",
    requiresPatient: true,
  },
  {
    name: "clinical.note",
    risk: "YELLOW",
    description: "Añadir una nota clínica",
    requiresPatient: true,
  },
  {
    name: "budget.sync",
    risk: "YELLOW",
    description: "Sincronizar el presupuesto",
    requiresPatient: true,
  },
  { name: "payment.record", risk: "RED", description: "Registrar un cobro", requiresPatient: true },
  { name: "patient.create", risk: "RED", description: "Crear un paciente", requiresPatient: false },
  {
    name: "appointment.reschedule",
    risk: "RED",
    description: "Reagendar una cita",
    requiresPatient: true,
  },
  {
    name: "appointment.mark_no_show",
    risk: "RED",
    description: "Marcar una ausencia",
    requiresPatient: true,
  },
  {
    name: "documents.export",
    risk: "RED",
    description: "Exportar documentación del paciente",
    requiresPatient: true,
  },
  {
    name: "recall.create",
    risk: "YELLOW",
    description: "Crear un recall de mantenimiento",
    requiresPatient: true,
  },
];

export const assistantToolRegistry = new Map(
  definitions.map((definition) => [definition.name, definition]),
);

export function getAssistantToolDefinition(name: string): AssistantToolDefinition | undefined {
  return assistantToolRegistry.get(name);
}
