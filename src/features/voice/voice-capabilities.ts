import type { LocalVoiceAction } from "./local-nlu";

export interface VoiceCapabilityExample {
  label: string;
  example: string;
  actionType: LocalVoiceAction["type"];
  safety: "navigation" | "confirm";
}

export interface VoiceCapabilityGroup {
  area: string;
  description: string;
  capabilities: readonly VoiceCapabilityExample[];
}

export const VOICE_CAPABILITY_GROUPS: readonly VoiceCapabilityGroup[] = [
  {
    area: "Navegación",
    description: "Abre secciones; no modifica datos.",
    capabilities: [
      {
        label: "Abrir la agenda",
        example: "Oye Denty, abre la agenda",
        actionType: "navigation.open",
        safety: "navigation",
      },
      {
        label: "Ver agenda de mañana",
        example: "Oye Denty, muéstrame las citas de mañana",
        actionType: "navigation.open",
        safety: "navigation",
      },
      {
        label: "Abrir pacientes",
        example: "Oye Denty, ve a pacientes",
        actionType: "navigation.open",
        safety: "navigation",
      },
      {
        label: "Abrir laboratorio",
        example: "Oye Denty, abre el laboratorio",
        actionType: "navigation.open",
        safety: "navigation",
      },
      {
        label: "Abrir finanzas",
        example: "Oye Denty, llévame a finanzas",
        actionType: "navigation.open",
        safety: "navigation",
      },
      {
        label: "Abrir tareas",
        example: "Oye Denty, ver tareas pendientes",
        actionType: "navigation.open",
        safety: "navigation",
      },
      {
        label: "Abrir ajustes",
        example: "Oye Denty, abre ajustes",
        actionType: "navigation.open",
        safety: "navigation",
      },
      {
        label: "Abrir documentos",
        example: "Oye Denty, abre documentos",
        actionType: "navigation.open",
        safety: "navigation",
      },
      {
        label: "Abrir una ficha",
        example: "Oye Denty, abre la ficha de Ana López",
        actionType: "navigation.patient",
        safety: "navigation",
      },
      {
        label: "Abrir odontograma",
        example: "Oye Denty, abre el odontograma",
        actionType: "navigation.open",
        safety: "navigation",
      },
    ],
  },
  {
    area: "Pacientes",
    description: "Las coincidencias de pacientes se resuelven antes de continuar.",
    capabilities: [
      {
        label: "Crear paciente",
        example: "Oye Denty, crea el paciente Ana López con DNI 12345678Z",
        actionType: "patient.create",
        safety: "confirm",
      },
    ],
  },
  {
    area: "Agenda",
    description: "Las citas se revisan en la vista previa antes de guardar.",
    capabilities: [
      {
        label: "Marcar llegada",
        example: "Oye Denty, ha llegado Ana López",
        actionType: "appointment.arrive",
        safety: "confirm",
      },
      {
        label: "Marcar ausencia",
        example: "Oye Denty, Ana López no ha venido",
        actionType: "appointment.no_show",
        safety: "confirm",
      },
      {
        label: "Agendar cita",
        example: "Oye Denty, agenda una cita para Ana López mañana a las diez",
        actionType: "appointment.schedule",
        safety: "confirm",
      },
      {
        label: "Reagendar cita",
        example: "Oye Denty, reprograma la cita de Ana López para mañana a las diez",
        actionType: "appointment.reschedule",
        safety: "confirm",
      },
    ],
  },
  {
    area: "Clínica",
    description: "Los cambios clínicos requieren revisar el paciente, la pieza y el detalle.",
    capabilities: [
      {
        label: "Registrar hallazgo",
        example: "Oye Denty, apunta caries en distal del 23",
        actionType: "odontogram.set_state",
        safety: "confirm",
      },
      {
        label: "Planificar tratamiento",
        example: "Oye Denty, planifica una corona en el 21",
        actionType: "clinical.add_item",
        safety: "confirm",
      },
      {
        label: "Registrar tratamiento realizado",
        example: "Oye Denty, endodoncia realizada en 22",
        actionType: "clinical.complete_item",
        safety: "confirm",
      },
      {
        label: "Dictar nota",
        example: "Oye Denty, anota que refiere dolor al frío",
        actionType: "clinical.note",
        safety: "confirm",
      },
      {
        label: "Registrar sondaje",
        example: "Oye Denty, 26 mesiovestibular sondaje 6 sangrado",
        actionType: "periodontal.update",
        safety: "confirm",
      },
      {
        label: "Preparar presupuesto",
        example: "Oye Denty, prepara el presupuesto",
        actionType: "budget.sync",
        safety: "confirm",
      },
    ],
  },
  {
    area: "Finanzas",
    description: "Los cobros muestran importe y método para su revisión.",
    capabilities: [
      {
        label: "Registrar cobro",
        example: "Oye Denty, Ana López ha pagado 120 euros con tarjeta",
        actionType: "payment.record",
        safety: "confirm",
      },
    ],
  },
  {
    area: "Laboratorio",
    description: "Los cambios de estado se revisan antes de aplicarse.",
    capabilities: [
      {
        label: "Marcar trabajo recibido",
        example: "Oye Denty, ha llegado el trabajo del laboratorio",
        actionType: "lab.transition",
        safety: "confirm",
      },
    ],
  },
];
