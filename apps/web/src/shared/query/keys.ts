export const dentyQueryKeys = {
  patients: {
    all: ["patients"] as const,
    detail: (patientId: string) => ["patients", patientId] as const,
    projection: (patientId: string) => ["patients", patientId, "projection"] as const,
  },
  appointments: {
    day: (date: string) => ["appointments", { date }] as const,
    context: ["appointments", "context"] as const,
  },
  clinical: {
    odontogram: (patientId: string) => ["clinical", patientId, "odontogram"] as const,
    snapshots: (patientId: string) =>
      ["clinical", patientId, "odontogram", "snapshots"] as const,
    plan: (patientId: string) => ["clinical", patientId, "plan"] as const,
    workflow: (patientId: string) => ["clinical", patientId, "workflow"] as const,
    sync: (patientId: string) => ["clinical", patientId, "sync"] as const,
  },
  documents: {
    patient: (patientId: string) => ["documents", { patientId }] as const,
  },
  prescriptions: {
    all: ["prescriptions"] as const,
    settings: ["prescriptions", "settings"] as const,
  },
  laboratory: {
    all: ["laboratory"] as const,
  },
  finance: {
    invoices: ["finance", "invoices"] as const,
    payments: ["finance", "payments"] as const,
    budgets: ["finance", "budgets"] as const,
    series: ["finance", "series"] as const,
    verifactu: ["finance", "verifactu"] as const,
  },
} as const;
