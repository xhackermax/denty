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
  birthDate?: string;
  allergies?: readonly string[];
  medications?: readonly string[];
  conditions?: readonly string[];
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
  status: "PLANNED" | "CONFIRMED" | "ARRIVED" | "IN_CHAIR" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
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
    birthDate: "1984-05-17",
    allergies: ["Penicilina"],
    medications: ["Atorvastatina 20 mg"],
    conditions: ["Hipertensión controlada"],
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
    birthDate: "1991-11-03",
    allergies: [],
    medications: [],
    conditions: ["Bruxismo"],
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
    birthDate: "1976-02-22",
    allergies: ["Látex"],
    medications: [],
    conditions: [],
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
    birthDate: "2000-08-30",
    allergies: [],
    medications: ["Anticonceptivo oral"],
    conditions: [],
    source: "Doctoralia",
    nextStep: "Entregar férula",
    lastVisitAt: "2026-09-04T13:00:00+02:00",
    nextVisitAt: "2026-09-21T13:00:00+02:00",
    balanceCents: 18000,
  },
  {
    id: "sofia-ruiz",
    recordNumber: "000731",
    firstName: "Sofía",
    lastName: "Ruiz",
    dni: "Menor",
    phone: "+34 600 731 100",
    email: "tutor.sofia@example.test",
    birthDate: "2021-11-14",
    allergies: [],
    medications: [],
    conditions: [],
    source: "Recomendación",
    nextStep: "Control de dentición primaria",
    lastVisitAt: "2026-09-10T17:00:00+02:00",
    balanceCents: 0,
  },
  {
    id: "mateo-santos",
    recordNumber: "000744",
    firstName: "Mateo",
    lastName: "Santos",
    dni: "Menor",
    phone: "+34 600 744 200",
    email: "tutor.mateo@example.test",
    birthDate: "2017-04-03",
    allergies: ["Ibuprofeno"],
    medications: [],
    conditions: [],
    source: "Google",
    nextStep: "Control de dentición mixta",
    lastVisitAt: "2026-09-12T17:30:00+02:00",
    balanceCents: 3500,
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

export const DEMO_LAB_ACCOUNTS = [
  {
    id: "lab-zaragoza",
    name: "Dental Lab Zaragoza",
    taxId: "B50010001",
    phone: "976 100 101",
    email: "hola@dentallabzaragoza.demo",
    active: true,
  },
  {
    id: "lab-central",
    name: "Prótesis Central",
    taxId: "B50020002",
    phone: "976 200 202",
    email: "trabajos@protesiscentral.demo",
    active: true,
  },
  {
    id: "lab-digital",
    name: "Aragón Digital Lab",
    taxId: "B50030003",
    phone: "976 300 303",
    email: "scan@aragondigital.demo",
    active: true,
  },
  { id: "lab-legacy", name: "Laboratorio histórico", active: false },
] as const;

export const DEMO_LAB_WORKS = [
  {
    id: "LAB-1042",
    patient: "Juan Pérez",
    title: "Corona 46",
    labId: "lab-zaragoza",
    eta: "24 sep",
    costCents: 14500,
    status: "IN_PRODUCTION",
    attachments: ["scan-46.stl"],
  },
  {
    id: "LAB-1043",
    patient: "Carlos García",
    title: "Estructura 11-13",
    labId: "lab-central",
    eta: "22 sep",
    costCents: 22000,
    status: "TRIAL",
    attachments: [],
  },
  {
    id: "LAB-1044",
    patient: "Ana Martín",
    title: "Férula Michigan",
    labId: "lab-zaragoza",
    eta: "21 sep",
    costCents: 8500,
    status: "RECEIVED",
    attachments: ["orden-ferula.pdf"],
  },
  {
    id: "LAB-1045",
    patient: "María López",
    title: "Corona zirconio 26",
    labId: "lab-digital",
    eta: "29 sep",
    costCents: 17500,
    status: "SENT",
    attachments: ["26.stl"],
  },
  {
    id: "LAB-1046",
    patient: "Juan Pérez",
    title: "Provisional 46",
    labId: "lab-digital",
    eta: "25 sep",
    costCents: 6500,
    status: "PLACED",
    attachments: [],
  },
  {
    id: "LAB-1047",
    patient: "Carlos García",
    title: "Repetición estructura 12",
    labId: "lab-central",
    eta: "30 sep",
    costCents: 0,
    reworkCostCents: 9000,
    status: "IN_PRODUCTION",
    attachments: [],
  },
  {
    id: "LAB-1048",
    patient: "Ana Martín",
    title: "Retenedor",
    labId: "lab-zaragoza",
    eta: "02 oct",
    costCents: 9500,
    status: "PLANNED",
    attachments: [],
  },
  {
    id: "LAB-1049",
    patient: "María López",
    title: "Carilla 11",
    labId: "lab-digital",
    eta: "03 oct",
    costCents: 16000,
    status: "SCANNED",
    attachments: ["foto-11.jpg"],
  },
] as const;

export const DEMO_LAB_PAYMENTS = [
  {
    id: "LP-1",
    labId: "lab-zaragoza",
    amountCents: 18000,
    paidAt: "2026-09-18",
    note: "Transferencia",
  },
  {
    id: "LP-2",
    labId: "lab-central",
    amountCents: 22000,
    paidAt: "2026-09-20",
    note: "Transferencia",
  },
  {
    id: "LP-3",
    labId: "lab-digital",
    amountCents: 10000,
    paidAt: "2026-09-21",
    note: "Pago parcial",
  },
] as const;

export const DEMO_TREATMENT_ANALYTICS = [
  {
    treatment: "Implantes",
    producedCents: 760000,
    invoicedCents: 690000,
    collectedCents: 600000,
    costCents: 235000,
    count: 8,
  },
  {
    treatment: "Coronas",
    producedCents: 520000,
    invoicedCents: 480000,
    collectedCents: 430000,
    costCents: 160000,
    count: 11,
  },
  {
    treatment: "Endodoncia",
    producedCents: 345000,
    invoicedCents: 320000,
    collectedCents: 285000,
    costCents: 52000,
    count: 12,
  },
  {
    treatment: "Ortodoncia",
    producedCents: 410000,
    invoicedCents: 365000,
    collectedCents: 310000,
    costCents: 90000,
    count: 5,
  },
  {
    treatment: "Higiene",
    producedCents: 175000,
    invoicedCents: 170000,
    collectedCents: 165000,
    costCents: 28000,
    count: 29,
  },
  {
    treatment: "Restauraciones",
    producedCents: 260000,
    invoicedCents: 240000,
    collectedCents: 220000,
    costCents: 51000,
    count: 31,
  },
  {
    treatment: "Cirugía",
    producedCents: 225000,
    invoicedCents: 190000,
    collectedCents: 150000,
    costCents: 82000,
    count: 7,
  },
  {
    treatment: "Prótesis removible",
    producedCents: 150000,
    invoicedCents: 145000,
    collectedCents: 80000,
    costCents: 69000,
    count: 4,
  },
] as const;

export const DEMO_DOCTOR_ANALYTICS = [
  {
    doctorId: "maximo",
    doctor: "Máximo Tiburcio",
    producedCents: 1190000,
    invoicedCents: 1060000,
    collectedCents: 930000,
    count: 48,
  },
  {
    doctorId: "isaac",
    doctor: "Isaac Tiburcio",
    producedCents: 970000,
    invoicedCents: 860000,
    collectedCents: 770000,
    count: 39,
  },
  {
    doctorId: "seneida",
    doctor: "Seneida",
    producedCents: 685000,
    invoicedCents: 590000,
    collectedCents: 520000,
    count: 33,
  },
] as const;

export const DEMO_MONTHLY_ANALYTICS = [
  { month: "Abr", producedCents: 1940000, invoicedCents: 1760000, collectedCents: 1620000 },
  { month: "May", producedCents: 2180000, invoicedCents: 2010000, collectedCents: 1820000 },
  { month: "Jun", producedCents: 2320000, invoicedCents: 2140000, collectedCents: 1930000 },
  { month: "Jul", producedCents: 2490000, invoicedCents: 2250000, collectedCents: 2010000 },
  { month: "Ago", producedCents: 2210000, invoicedCents: 2040000, collectedCents: 1910000 },
  { month: "Sep", producedCents: 2845000, invoicedCents: 2510000, collectedCents: 2240000 },
] as const;

export const DEMO_BUDGETS = [
  { id: "PRE-2026-0104", patientId: "juan-perez", totalCents: 185000, status: "PRESENTED" },
  { id: "PRE-2026-0098", patientId: "ana-martin", totalCents: 95000, status: "DRAFT" },
  { id: "PRE-2026-0091", patientId: "carlos-garcia", totalCents: 220000, status: "ACCEPTED" },
] as const;
