export interface QualityStaff {
  id: string; display_name: string; role: string; active: boolean;
}
export interface QualityPatient {
  id: string; first_name: string; last_name: string; record_number: string | null;
}
export interface QualityIncident {
  id: string; patient_id: string; appointment_id: string | null;
  responsible_doctor_id: string | null; title: string; description: string;
  category: string; cause: string; severity: string; status: string;
  repeat_treatment: boolean; cost_cents: number;
  corrective_action: string | null; occurred_at: string; updated_at: string;
  patientName: string; recordNumber: string | null;
}
export interface QualityDoctor {
  doctorId: string; doctorName: string; completedVisits: number; uniquePatients: number;
  treatmentCounts: Record<string, number>; recordedExecutions: number;
  attributedRevenueCents: number; attributedRevenueCoverage: number;
  averageTicketCents: number | null; repeatedTreatmentIncidents: number;
  reportedIncidents: number; placedImplants: number; failedPlacementAttempts: number;
  subsequentImplantFailures: number; deferredImplants: number;
  attendanceHours: number | null; attendanceNote: string | null;
}
export interface QualityDoctorsResult {
  items: QualityDoctor[]; warning: string;
}
export interface QualityIncidentsResult {
  items: QualityIncident[]; truncated: boolean;
}
export type IncidentCreateInput = {
  patientId: string; appointmentId?: string | null; doctorId?: string | null;
  title: string; description: string; category: string; cause: string;
  severity: string; repeatTreatment: boolean; costCents: number;
};

function qs(kind: string, args: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams({ kind });
  for (const [key, value] of Object.entries(args)) if (value) params.set(key, value);
  return `/api/quality?${params.toString()}`;
}
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const reply = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
  const body = await reply.json() as { error?: { message?: string } };
  if (!reply.ok) throw new Error(body.error?.message ?? "No se pudo conectar con Supabase.");
  return body as T;
}
export const qualityApi = {
  doctors: (range: { start: string; end: string; siteId?: string }) =>
    request<QualityDoctorsResult>(qs("doctors", range)),
  incidents: (filters: { patientId?: string; doctorId?: string; status?: string } = {}) =>
    request<QualityIncidentsResult>(qs("incidents", filters)),
  staff: () => request<{ items: QualityStaff[] }>(qs("staff")),
  patients: (search: string) =>
    request<{ items: QualityPatient[] }>(qs("patients", { search })),
  createIncident: (data: IncidentCreateInput) =>
    request<QualityIncident>(qs("incidents"), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }),
  updateIncident: (id: string, status: string, correctiveAction: string) =>
    request<QualityIncident>(qs("incidents"), {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status, correctiveAction }),
    }),
};
