const root = <T extends string>(domain: T) => ["denty", domain] as const;

export const dentyQueryKeys = {
  session: ["denty", "session"] as const,
  patients: {
    root: root("patients"),
    all: ["denty", "patients", "list", { includeArchived: false }] as const,
    list: (includeArchived = false) => ["denty", "patients", "list", { includeArchived }] as const,
    page: (includeArchived = false, search = "", page = 1) =>
      ["denty", "patients", "list", { includeArchived }, search, page] as const,
    detail: (patientId: string) => ["denty", "patients", "detail", patientId] as const,
    projection: (patientId: string) => ["denty", "patients", "projection", patientId] as const,
  },
  appointments: {
    root: root("appointments"),
    day: (date: string, siteId?: string | null) =>
      ["denty", "appointments", "day", { date, siteId: siteId ?? null }] as const,
    blocks: (date: string, siteId?: string | null) =>
      ["denty", "appointments", "blocks", { date, siteId: siteId ?? null }] as const,
    dayRoot: ["denty", "appointments", "day"] as const,
    availabilityIdle: ["denty", "appointments", "availability", "idle"] as const,
    availability: (date: string, staffId: string, siteId: string | null, durationMin: number) =>
      ["denty", "appointments", "availability", { date, staffId, siteId, durationMin }] as const,
    context: ["denty", "appointments", "context"] as const,
    settings: ["denty", "appointments", "settings"] as const,
  },
  clinical: {
    root: root("clinical"),
    odontogram: (patientId: string) => ["denty", "clinical", patientId, "odontogram"] as const,
    snapshots: (patientId: string) =>
      ["denty", "clinical", patientId, "odontogram", "snapshots"] as const,
    plan: (patientId: string) => ["denty", "clinical", patientId, "plan"] as const,
    workflow: (patientId: string) => ["denty", "clinical", patientId, "workflow"] as const,
    sync: (patientId: string) => ["denty", "clinical", patientId, "sync"] as const,
    consents: (patientId: string) => ["denty", "clinical", patientId, "consents"] as const,
  },
  documents: {
    root: root("documents"),
    patient: (patientId: string) => ["denty", "documents", { patientId }] as const,
    all: ["denty", "documents", "list"] as const,
    templates: ["denty", "documents", "templates"] as const,
    allTemplateVersions: ["denty", "documents", "templates", "all-versions"] as const,
  },
  prescriptions: {
    root: root("prescriptions"),
    all: ["denty", "prescriptions", "list"] as const,
    settings: ["denty", "prescriptions", "settings"] as const,
    history: (id: string) => ["denty", "prescriptions", "history", id] as const,
  },
  laboratory: {
    root: root("laboratory"),
    all: ["denty", "laboratory", "works"] as const,
    laboratories: ["denty", "laboratory", "master"] as const,
    balances: ["denty", "laboratory", "balances"] as const,
    supplierInvoices: ["denty", "laboratory", "supplier-invoices"] as const,
    supplierPayments: ["denty", "laboratory", "supplier-payments"] as const,
    suppliers: ["denty", "laboratory", "suppliers"] as const,
  },
  finance: {
    root: root("finance"),
    invoices: ["denty", "finance", "invoices"] as const,
    payments: ["denty", "finance", "payments"] as const,
    budgets: ["denty", "finance", "budgets"] as const,
    series: ["denty", "finance", "series"] as const,
    verifactu: ["denty", "finance", "verifactu"] as const,
    billingSettings: ["denty", "finance", "billing-settings"] as const,
    terminals: ["denty", "finance", "terminals"] as const,
    terminalsOverview: ["denty", "finance", "terminals", "overview"] as const,
  },
  alerts: {
    root: root("alerts"),
    all: ["denty", "alerts", "list"] as const,
  },
  analytics: {
    root: root("analytics"),
    kpiDefinitions: ["denty", "analytics", "kpi-definitions"] as const,
    summary: (scope: Record<string, unknown> = {}) =>
      ["denty", "analytics", "summary", scope] as const,
    treatments: (scope: Record<string, unknown> = {}) =>
      ["denty", "analytics", "treatments", scope] as const,
    doctors: (scope: Record<string, unknown> = {}) =>
      ["denty", "analytics", "doctors", scope] as const,
    monthly: (scope: Record<string, unknown> = {}) =>
      ["denty", "analytics", "monthly", scope] as const,
    profitability: (scope: Record<string, unknown> = {}) =>
      ["denty", "analytics", "profitability", scope] as const,
    waitTimes: (scope: Record<string, unknown> = {}) =>
      ["denty", "analytics", "wait-times", scope] as const,
  },
  dashboard: { root: root("dashboard"), today: ["denty", "dashboard", "today"] as const },
  settings: {
    root: root("settings"),
    clinic: (clinicId: string) => ["denty", "settings", "clinic", clinicId] as const,
    site: (siteId: string) => ["denty", "settings", "site", siteId] as const,
    sitesOverview: ["denty", "settings", "sites-overview"] as const,
  },
  treatmentCatalog: {
    root: root("treatment-catalog"),
    all: ["denty", "treatment-catalog", "list"] as const,
    detail: (treatmentId: string) => ["denty", "treatment-catalog", "detail", treatmentId] as const,
  },

  security: {
    root: ["denty", "security"] as const,
    sessions: ["denty", "security", "sessions"] as const,
    backups: ["denty", "security", "backups"] as const,
    privacy: ["denty", "security", "privacy"] as const,
    users: ["denty", "security", "users"] as const,
  },
  staff: {
    root: root("staff"),
    all: ["denty", "staff", "list"] as const,
    attendance: (date: string) => ["denty", "staff", "attendance", date] as const,
    absences: ["denty", "staff", "absences"] as const,
  },
  portal: {
    root: root("portal"),
    patient: (patientId: string) => ["denty", "portal", patientId] as const,
    waitlist: (patientId: string) => ["denty", "portal", patientId, "waitlist"] as const,
  },
  communications: {
    root: root("communications"),
    all: ["denty", "communications", "list"] as const,
    consents: (patientId: string) => ["denty", "communications", "consents", patientId] as const,
  },
  campaigns: { root: root("campaigns"), all: ["denty", "campaigns", "list"] as const },
  tasks: { root: root("tasks"), all: ["denty", "tasks", "list"] as const },
} as const;
