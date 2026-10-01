/**
 * Development-only mock data for testing when Supabase is not configured.
 * Used to enable local development without needing Supabase credentials.
 */

export interface MockPatient {
  id: string;
  clinicId: string;
  recordNumber: string;
  firstName: string;
  lastName: string;
  dni: string | null;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  declaredSource: string | null;
  declaredSourceDetail: string | null;
  photoUrl: string | null;
  lastVisitAt: string | null;
  nextVisitAt: string | null;
  archivedAt: string | null;
  archivedReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

const CLINIC_ID = "clinic-dev-00000000-0000-0000-0000-000000000000";

const mockPatients: MockPatient[] = [
  {
    id: "patient-dev-1",
    clinicId: CLINIC_ID,
    recordNumber: "001",
    firstName: "Juan",
    lastName: "García",
    dni: "12345678A",
    phone: "+34 600 000 001",
    email: "juan@example.com",
    birthDate: "1985-03-15",
    declaredSource: "referral",
    declaredSourceDetail: "Recomendación de amigo",
    photoUrl: null,
    lastVisitAt: "2026-09-25T10:30:00Z",
    nextVisitAt: "2026-10-15T14:00:00Z",
    archivedAt: null,
    archivedReason: null,
    version: 1,
    createdAt: "2026-01-10T08:00:00Z",
    updatedAt: "2026-09-25T10:30:00Z",
  },
  {
    id: "patient-dev-2",
    clinicId: CLINIC_ID,
    recordNumber: "002",
    firstName: "María",
    lastName: "López",
    dni: "87654321B",
    phone: "+34 600 000 002",
    email: "maria@example.com",
    birthDate: "1990-07-22",
    declaredSource: "website",
    declaredSourceDetail: null,
    photoUrl: null,
    lastVisitAt: "2026-09-20T15:45:00Z",
    nextVisitAt: null,
    archivedAt: null,
    archivedReason: null,
    version: 1,
    createdAt: "2026-02-15T09:30:00Z",
    updatedAt: "2026-09-20T15:45:00Z",
  },
  {
    id: "patient-dev-3",
    clinicId: CLINIC_ID,
    recordNumber: "003",
    firstName: "Carlos",
    lastName: "Martínez",
    dni: "11111111C",
    phone: "+34 600 000 003",
    email: "carlos@example.com",
    birthDate: "1988-11-05",
    declaredSource: "phone",
    declaredSourceDetail: null,
    photoUrl: null,
    lastVisitAt: "2026-09-18T11:15:00Z",
    nextVisitAt: "2026-10-10T09:00:00Z",
    archivedAt: null,
    archivedReason: null,
    version: 2,
    createdAt: "2025-06-01T07:00:00Z",
    updatedAt: "2026-09-18T11:15:00Z",
  },
  {
    id: "patient-dev-4",
    clinicId: CLINIC_ID,
    recordNumber: "004",
    firstName: "Ana",
    lastName: "Rodríguez",
    dni: "22222222D",
    phone: "+34 600 000 004",
    email: "ana@example.com",
    birthDate: "1995-05-30",
    declaredSource: "direct",
    declaredSourceDetail: null,
    photoUrl: null,
    lastVisitAt: null,
    nextVisitAt: "2026-10-05T13:30:00Z",
    archivedAt: null,
    archivedReason: null,
    version: 1,
    createdAt: "2026-08-22T14:20:00Z",
    updatedAt: "2026-08-22T14:20:00Z",
  },
  {
    id: "patient-dev-5",
    clinicId: CLINIC_ID,
    recordNumber: "005",
    firstName: "Roberto",
    lastName: "Sánchez",
    dni: "33333333E",
    phone: "+34 600 000 005",
    email: "roberto@example.com",
    birthDate: "1980-12-10",
    declaredSource: "referral",
    declaredSourceDetail: null,
    photoUrl: null,
    lastVisitAt: "2026-09-01T16:00:00Z",
    nextVisitAt: null,
    archivedAt: "2026-09-15T10:00:00Z",
    archivedReason: "Mudanza al extranjero",
    version: 1,
    createdAt: "2024-03-10T10:00:00Z",
    updatedAt: "2026-09-15T10:00:00Z",
  },
];

export function getDevMockPatients(options?: {
  includeArchived?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}): {
  items: MockPatient[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  let filtered = mockPatients;

  if (!options?.includeArchived) {
    filtered = filtered.filter((p) => !p.archivedAt);
  }

  if (options?.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.recordNumber.includes(q) ||
        p.dni?.toLowerCase().includes(q),
    );
  }

  const pageSize = options?.pageSize ?? 50;
  const page = Math.max(1, options?.page ?? 1);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = filtered.slice(start, end);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function getDevMockPatient(id: string): MockPatient | null {
  return mockPatients.find((p) => p.id === id) ?? null;
}
