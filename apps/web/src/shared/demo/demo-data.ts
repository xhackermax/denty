export interface DemoStaff {
  id: string;
  displayName: string;
  role: string;
  site: string;
}

export interface DemoPatient {
  id: string;
  recordNumber: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  dni: string;
  phone: string;
  email: string;
  source: string;
  nextStep: string;
  lastVisitAt?: string;
  nextVisitAt?: string;
  balanceCents: number;
}

export interface DemoAppointment {
  id: string;
  patientId: string;
  patientName: string;
  staffId: string;
  startsAt: string;
  endsAt: string;
  status: "PLANNED" | "CONFIRMED" | "ARRIVED" | "IN_CHAIR" | "COMPLETED";
  reason: string;
}

export const DEMO_STAFF: readonly DemoStaff[] = [
  { id: "maximo", displayName: "Máximo Tiburcio", role: "Odontólogo", site: "Av. Navarra" },
  { id: "isaac", displayName: "Isaac Tiburcio", role: "Odontólogo", site: "Av. Navarra" },
  { id: "seneida", displayName: "Seneida", role: "Odontóloga", site: "Cariñena" },
];

export const DEMO_PATIENTS: readonly DemoPatient[] = [
  {
    id: "juan-perez",
    recordNumber: "000104",
    firstName: "Juan",
    lastName: "Pérez",
    photoUrl: "/assets/patients/demo-juan.svg",
    dni: "12345678Z",
    phone: "+34 600 123 456",
    email: "juan.perez@example.test",
    source: "Recomendación",
    nextStep: "Valorar implante 46 y cerrar presupuesto",
    lastVisitAt: "2026-09-16T10:30:00+02:00",
    nextVisitAt: "2026-09-28T10:00:00+02:00",
    balanceCents: 145000,
  },
  {
    id: "maria-lopez",
    recordNumber: "000287",
    firstName: "María",
    lastName: "López",
    photoUrl: "/assets/patients/demo-maria.svg",
    dni: "23456789D",
    phone: "+34 600 234 567",
    email: "maria.lopez@example.test",
    source: "Google",
    nextStep: "Revisión periodontal",
    lastVisitAt: "2026-09-21T09:00:00+02:00",
    balanceCents: 0,
  },
  {
    id: "carlos-garcia",
    recordNumber: "000451",
    firstName: "Carlos",
    lastName: "García",
    photoUrl: "/assets/patients/demo-carlos.svg",
    dni: "34567890V",
    phone: "+34 600 345 678",
    email: "carlos.garcia@example.test",
    source: "Meta Ads",
    nextStep: "Prueba de estructura",
    lastVisitAt: "2026-09-11T11:30:00+02:00",
    nextVisitAt: "2026-09-24T11:30:00+02:00",
    balanceCents: 42000,
  },
  {
    id: "ana-martin",
    recordNumber: "000612",
    firstName: "Ana",
    lastName: "Martín",
    photoUrl: "/assets/patients/demo-ana.svg",
    dni: "45678901G",
    phone: "+34 600 456 789",
    email: "ana.martin@example.test",
    source: "Doctoralia",
    nextStep: "Entregar férula",
    lastVisitAt: "2026-09-04T13:00:00+02:00",
    nextVisitAt: "2026-09-21T13:00:00+02:00",
    balanceCents: 18000,
  },
];

export const DEMO_APPOINTMENTS: readonly DemoAppointment[] = [
  {
    id: "a-1",
    patientId: "maria-lopez",
    patientName: "María López",
    staffId: "maximo",
    startsAt: "2026-09-21T09:00:00+02:00",
    endsAt: "2026-09-21T09:30:00+02:00",
    status: "COMPLETED",
    reason: "Revisión",
  },
  {
    id: "a-2",
    patientId: "juan-perez",
    patientName: "Juan Pérez",
    staffId: "maximo",
    startsAt: "2026-09-21T10:00:00+02:00",
    endsAt: "2026-09-21T11:00:00+02:00",
    status: "IN_CHAIR",
    reason: "Plan implantológico 46",
  },
  {
    id: "a-3",
    patientId: "carlos-garcia",
    patientName: "Carlos García",
    staffId: "isaac",
    startsAt: "2026-09-21T11:30:00+02:00",
    endsAt: "2026-09-21T12:00:00+02:00",
    status: "ARRIVED",
    reason: "Prueba de estructura",
  },
  {
    id: "a-4",
    patientId: "ana-martin",
    patientName: "Ana Martín",
    staffId: "seneida",
    startsAt: "2026-09-21T13:00:00+02:00",
    endsAt: "2026-09-21T13:30:00+02:00",
    status: "CONFIRMED",
    reason: "Entrega férula",
  },
];

export const DEMO_LAB = [
  ["LAB-1042", "Juan Pérez", "Corona 46", "En laboratorio", "24 sep"],
  ["LAB-1043", "Carlos García", "Estructura 11-13", "Prueba", "22 sep"],
  ["LAB-1044", "Ana Martín", "Férula Michigan", "Recibido", "21 sep"],
] as const;

export const DEMO_PRESCRIPTIONS = [
  ["RX-2031", "María López", "Ibuprofeno 600 mg", "Validada"],
  ["RX-2032", "Juan Pérez", "Amoxicilina 500 mg", "Borrador"],
] as const;

export const DEMO_DOCUMENTS = [
  ["DOC-778", "Juan Pérez", "Consentimiento implantes", "Firmado"],
  ["DOC-779", "Carlos García", "Presupuesto rehabilitación", "Entregado"],
  ["DOC-780", "Ana Martín", "Justificante de asistencia", "Finalizado"],
] as const;

export const DEMO_COMMUNICATIONS = [
  ["Juan Pérez", "WhatsApp", "Recordatorio de cita", "Enviado"],
  ["María López", "Email", "Revisión semestral", "Programado"],
  ["Carlos García", "SMS", "Laboratorio recibido", "Enviado"],
] as const;

export const DEMO_CAMPAIGNS = [
  ["Implantes verano", "Meta", "Activa", "500 €", "18 leads"],
  ["Ortodoncia -20%", "Google", "Activa", "320 €", "11 leads"],
  ["Higiene YUDIGAR", "Interna", "Pausada", "0 €", "34 contactos"],
] as const;

export const DEMO_ALERTS = [
  ["Alta", "Laboratorio retrasado LAB-1042", "Laboratorio"],
  ["Media", "Presupuesto de Juan Pérez pendiente", "Pacientes"],
  ["Baja", "Revisar copia cifrada semanal", "Seguridad"],
] as const;

export const DEMO_TASKS = [
  ["Crear paciente", "Alta rápida con número de ficha"],
  ["Cobrar", "Registrar tarjeta, efectivo o transferencia"],
  ["Dar cita", "Abrir el asistente de agenda"],
  ["Recibir laboratorio", "Cambiar estado y notificar"],
] as const;

export const FINANCE_KPIS = {
  producedCents: 2845000,
  invoicedCents: 2510000,
  collectedCents: 2240000,
  costCents: 930000,
  marginCents: 1310000,
  pendingCents: 270000,
} as const;
