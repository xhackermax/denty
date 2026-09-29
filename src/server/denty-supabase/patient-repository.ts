import {
  medicalProfileSchema,
  type CreatePatient,
  type Patient,
  type UpdatePatient,
} from "@/shared/api";
import { odontogramSnapshotSchema } from "@/shared/api/schemas/clinical";
import type {
  OdontogramRecord,
  OdontogramSnapshot,
  PersistedDentalEntity,
  PersistedPeriodontalMeasurement,
} from "@/shared/api/schemas/clinical";

import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";

interface PatientRow {
  id: string;
  clinic_id: string;
  legacy_id: number | null;
  record_number: string;
  first_name: string;
  last_name: string;
  dni: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  declared_source: string | null;
  declared_source_detail: string | null;
  photo_url: string | null;
  photo_storage_path?: string | null;
  photo_mime_type?: string | null;
  photo_checksum?: string | null;
  medical_profile: Record<string, unknown> | null;
  archived_at: string | null;
  archived_reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface DentalEntityRow {
  id: string;
  tooth: string | null;
  arch: string | null;
  entity_type: string;
  status: string;
  surfaces_json: string[] | null;
  attributes_json: Record<string, unknown> | null;
  parent_id: string | null;
  active: boolean;
  version: number;
}

interface PeriodontalMeasurementRow {
  id: string;
  tooth: string;
  site: string;
  probing_depth: number | null;
  recession: number | null;
  bleeding: boolean | null;
  plaque: boolean | null;
  mobility: number | null;
  furcation: number | null;
  suppuration?: boolean | null;
  exam_version?: number | null;
  measured_at: string;
}

interface OdontogramSnapshotRow {
  id: string;
  label: string | null;
  payload_json: unknown;
  created_at: string;
  version: number | null;
}

interface OdontogramBatchInput {
  expectedVersion: number;
  entities: Array<{
    id?: string | undefined;
    tooth?: string | undefined;
    arch?: string | undefined;
    entityType: string;
    status: string;
    surfaces?: string[] | undefined;
    attributes?: Record<string, unknown> | undefined;
    parentId?: string | undefined;
    active: boolean;
  }>;
}

interface AppointmentProjectionRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  staff_id: string;
  site_id: string;
  cabinet_id: string | null;
  clinical_plan_item_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  title: string;
  reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface ClinicalPlanProjectionRow {
  id: string;
  status: string;
  source_odontogram_version: number | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface BudgetProjectionRow {
  id: string;
  status: string;
  total_cents: number;
  revision: number;
  version: number;
  created_at: string;
  updated_at: string;
}

interface DocumentProjectionRow {
  id: string;
  type: string;
  title: string;
  status: string;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PrescriptionProjectionRow {
  id: string;
  patient_id: string;
  status: string;
  prescription_date: string;
  issued_at: string | null;
  cancelled_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PatientLifecycleRpcResult {
  conflict?: boolean;
  id?: string;
  version?: number;
  archivedAt?: string | null;
  archivedReason?: string | null;
}

export class PatientRepository {
  private readonly clinicId?: string | undefined;
  private readonly allowedPatientIds?: readonly string[] | undefined;

  constructor(
    private readonly client: SupabaseRestClient,
    defaultClinicId?: string,
    options: {
      clinicId?: string | undefined;
      allowedPatientIds?: readonly string[] | undefined;
    } = {},
  ) {
    this.clinicId = options.clinicId ?? defaultClinicId;
    this.allowedPatientIds = options.allowedPatientIds;
  }

  async listPatients(options: { includeArchived?: boolean } = {}) {
    const query: Record<string, string | number | undefined> = {
      select: "*",
      order: "created_at.desc",
      ...(options.includeArchived ? {} : { archived_at: "is.null" }),
    };
    if (this.clinicId) query.clinic_id = `eq.${this.clinicId}`;
    const rows = await this.client.select<PatientRow>("patients", query);
    const items = rows.filter((row) => this.canReadPatient(row.id)).map(rowToPatient);
    return { items, total: items.length, page: 1, pageSize: items.length || 50 };
  }

  async getPatient(id: string): Promise<Patient | null> {
    if (!this.canReadPatient(id)) return null;
    const query: Record<string, string | number | undefined> = {
      select: "*",
      id: `eq.${id}`,
      limit: 1,
    };
    if (this.clinicId) query.clinic_id = `eq.${this.clinicId}`;
    const rows = await this.client.select<PatientRow>("patients", query);
    const row = rows[0];
    return row ? rowToPatient(row) : null;
  }

  async createPatient(payload: CreatePatient): Promise<Patient> {
    const clinicId = await this.resolveClinicId();
    const row = await this.client.insert<PatientRow>("patients", {
      clinic_id: clinicId,
      record_number: payload.recordNumber ?? createRecordNumber(),
      first_name: payload.firstName,
      last_name: payload.lastName,
      dni: payload.dni?.trim() || null,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      birth_date: payload.birthDate ?? null,
      declared_source: payload.declaredSource ?? null,
      declared_source_detail: payload.declaredSourceDetail ?? null,
      declared_campaign_id: payload.declaredCampaignId ?? null,
      medical_profile: payload.medicalProfile ?? {},
    });
    const confirmed = await this.getPatient(row.id);
    if (!confirmed) {
      throw new SupabaseRestError(
        "Supabase no confirmo la ficha creada en lectura posterior.",
        502,
        {
          insertedPatientId: row.id,
        },
      );
    }
    return confirmed;
  }

  async updatePatient(id: string, payload: UpdatePatient): Promise<Patient> {
    const body: Record<string, unknown> = {
      version: payload.expectedVersion + 1,
    };
    if (payload.firstName !== undefined) body.first_name = payload.firstName;
    if (payload.lastName !== undefined) body.last_name = payload.lastName;
    if (payload.dni !== undefined) body.dni = payload.dni;
    if (payload.phone !== undefined) body.phone = payload.phone;
    if (payload.email !== undefined) body.email = payload.email;
    if (payload.birthDate !== undefined) body.birth_date = payload.birthDate;
    if (payload.declaredSource !== undefined) body.declared_source = payload.declaredSource;
    if (payload.declaredSourceDetail !== undefined) {
      body.declared_source_detail = payload.declaredSourceDetail;
    }
    if (payload.medicalProfile !== undefined) body.medical_profile = payload.medicalProfile;

    const row = await this.client.patch<PatientRow>(
      "patients",
      { id: `eq.${id}`, version: `eq.${payload.expectedVersion}` },
      body,
    );
    return rowToPatient(row);
  }

  async setPatientPhoto(
    id: string,
    input: { path: string; mimeType: string; checksum: string },
  ): Promise<Patient> {
    const current = await this.getPatient(id);
    if (!current) throw new SupabaseRestError("Ficha no encontrada.", 404, { patientId: id });
    const row = await this.client.patch<PatientRow>(
      "patients",
      { id: `eq.${id}`, clinic_id: `eq.${current.clinicId}`, version: `eq.${current.version}` },
      {
        photo_url: `/api/patients/${encodeURIComponent(id)}/photo`,
        photo_storage_path: input.path,
        photo_mime_type: input.mimeType,
        photo_checksum: input.checksum,
        version: current.version + 1,
      },
    );
    return rowToPatient(row);
  }

  async getPatientPhotoStorage(id: string): Promise<{ path: string; mimeType: string } | null> {
    if (!this.canReadPatient(id)) return null;
    const query: Record<string, string | number | undefined> = {
      select: "*",
      id: `eq.${id}`,
      limit: 1,
    };
    if (this.clinicId) query.clinic_id = `eq.${this.clinicId}`;
    const rows = await this.client.select<PatientRow>("patients", query);
    const row = rows[0];
    if (!row?.photo_storage_path) return null;
    return { path: row.photo_storage_path, mimeType: row.photo_mime_type ?? "image/jpeg" };
  }

  async getOdontogram(patientId: string): Promise<OdontogramRecord | null> {
    const patient = await this.getPatient(patientId);
    if (!patient) return null;

    const [entities, periodontal, snapshots] = await Promise.all([
      this.client.select<DentalEntityRow>("dental_entities", {
        select: "*",
        patient_id: `eq.${patientId}`,
        active: "eq.true",
        order: "created_at.asc",
      }),
      this.client.select<PeriodontalMeasurementRow>("periodontal_measurements", {
        select: "*",
        patient_id: `eq.${patientId}`,
        order: "measured_at.desc",
      }),
      this.client.select<OdontogramSnapshotRow>("odontogram_snapshots", {
        select: "*",
        patient_id: `eq.${patientId}`,
        order: "created_at.desc",
      }),
    ]);

    return {
      id: patientId,
      patientId,
      version: maxVersion(entities),
      entities: entities.map(rowToDentalEntity),
      periodontal: currentPeriodontalMeasurements(periodontal).map(rowToPeriodontalMeasurement),
      snapshots: snapshots.map(rowToSnapshot),
    };
  }

  async saveOdontogramBatch(patientId: string, input: OdontogramBatchInput) {
    const patient = await this.getPatient(patientId);
    if (!patient) return null;

    const result = await this.client.rpc<{
      conflict?: boolean;
      currentVersion?: number;
      version?: number;
      entities?: DentalEntityRow[];
    }>("save_odontogram_batch", {
      p_patient_id: patientId,
      p_expected_version: input.expectedVersion,
      p_entities: input.entities,
    });

    if (result.conflict) {
      return {
        conflict: true as const,
        currentVersion: result.currentVersion ?? input.expectedVersion,
      };
    }
    if (!result.version || !Array.isArray(result.entities)) {
      throw new SupabaseRestError(
        "La RPC save_odontogram_batch devolvió una respuesta inválida.",
        502,
        result,
      );
    }

    return {
      entities: result.entities.map(rowToDentalEntity),
      version: result.version,
    };
  }

  async getProjection(patientId: string) {
    const patient = await this.getPatient(patientId);
    if (!patient) return null;

    const [appointments, plans, budgets, documents, prescriptions] = await Promise.all([
      this.client.select<AppointmentProjectionRow>("appointments", {
        select:
          "id,clinic_id,patient_id,staff_id,site_id,cabinet_id,clinical_plan_item_id,starts_at,ends_at,status,title,reason,version,created_at,updated_at",
        patient_id: `eq.${patientId}`,
        order: "starts_at.desc",
      }),
      this.client.select<ClinicalPlanProjectionRow>("clinical_plans", {
        select: "id,status,source_odontogram_version,version,created_at,updated_at",
        patient_id: `eq.${patientId}`,
        order: "updated_at.desc",
        limit: 1,
      }),
      this.client.select<BudgetProjectionRow>("budgets", {
        select: "id,status,total_cents,revision,version,created_at,updated_at",
        patient_id: `eq.${patientId}`,
        order: "updated_at.desc",
      }),
      this.client.select<DocumentProjectionRow>("documents", {
        select: "id,type,title,status,signed_at,created_at,updated_at",
        patient_id: `eq.${patientId}`,
        order: "created_at.desc",
      }),
      this.client.select<PrescriptionProjectionRow>("prescriptions", {
        select:
          "id,patient_id,status,prescription_date,issued_at,cancelled_at,version,created_at,updated_at",
        patient_id: `eq.${patientId}`,
        order: "created_at.desc",
      }),
    ]);

    const plan = plans[0];
    return {
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone ?? null,
        email: patient.email ?? null,
      },
      acquisitionSourceAnswered: Boolean(patient.declaredSource),
      appointments: appointments.map(rowToProjectionAppointment),
      plan: plan
        ? {
            id: plan.id,
            status: plan.status,
            sourceOdontogramVersion: plan.source_odontogram_version,
            version: plan.version,
            createdAt: plan.created_at,
            updatedAt: plan.updated_at,
          }
        : null,
      budgets: budgets.map((row) => ({
        id: row.id,
        status: row.status,
        totalCents: row.total_cents,
        revision: row.revision,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      documents: documents.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        status: row.status,
        signedAt: row.signed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      prescriptions: prescriptions.map((row) => ({
        id: row.id,
        status: row.status,
        prescriptionDate: row.prescription_date,
        issuedAt: row.issued_at,
        cancelledAt: row.cancelled_at,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    };
  }

  async archivePatient(patientId: string, input: { expectedVersion: number; reason?: string }) {
    const result = await this.client.rpc<PatientLifecycleRpcResult>("archive_patient", {
      p_patient_id: patientId,
      p_expected_version: input.expectedVersion,
      p_reason: input.reason ?? null,
    });
    if (result.conflict) {
      throw new SupabaseRestError("La ficha cambió antes de archivarse.", 409, result);
    }
    const patient = await this.getPatient(patientId);
    if (!patient) throw new SupabaseRestError("Ficha no encontrada tras archivar.", 404, result);
    return patient;
  }

  async restorePatient(patientId: string, input: { expectedVersion: number }) {
    const result = await this.client.rpc<PatientLifecycleRpcResult>("restore_patient", {
      p_patient_id: patientId,
      p_expected_version: input.expectedVersion,
    });
    if (result.conflict) {
      throw new SupabaseRestError("La ficha cambió antes de restaurarse.", 409, result);
    }
    const patient = await this.getPatient(patientId);
    if (!patient) throw new SupabaseRestError("Ficha no encontrada tras restaurar.", 404, result);
    return patient;
  }

  private async resolveClinicId(): Promise<string> {
    if (this.clinicId) return this.clinicId;
    throw new SupabaseRestError(
      "No hay una clínica autorizada en la sesión. Selecciona una membresía válida antes de crear pacientes.",
      403,
      { code: "CLINIC_CONTEXT_REQUIRED" },
    );
  }

  private canReadPatient(patientId: string) {
    return !this.allowedPatientIds || this.allowedPatientIds.includes(patientId);
  }
}

function rowToProjectionAppointment(row: AppointmentProjectionRow) {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    staffId: row.staff_id,
    siteId: row.site_id,
    cabinetId: row.cabinet_id,
    ...(row.clinical_plan_item_id ? { clinicalPlanItemId: row.clinical_plan_item_id } : {}),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    title: row.title,
    reason: row.reason,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPatient(row: PatientRow): Patient {
  const parsedMedicalProfile = medicalProfileSchema.safeParse(row.medical_profile);
  const patient: Patient = {
    id: row.id,
    clinicId: row.clinic_id,
    legacyId: row.legacy_id,
    recordNumber: row.record_number,
    firstName: row.first_name,
    lastName: row.last_name,
    dni: row.dni,
    phone: row.phone,
    email: row.email,
    birthDate: row.birth_date,
    declaredSource: row.declared_source as Patient["declaredSource"],
    declaredSourceDetail: row.declared_source_detail,
    photoUrl: row.photo_url,
    archivedAt: row.archived_at,
    archivedReason: row.archived_reason,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (parsedMedicalProfile.success) patient.medicalProfile = parsedMedicalProfile.data;
  return patient;
}

function rowToDentalEntity(row: DentalEntityRow): PersistedDentalEntity {
  return {
    id: row.id,
    tooth: row.tooth,
    arch: row.arch,
    entityType: row.entity_type,
    status: row.status,
    surfacesJson: row.surfaces_json,
    attributesJson: row.attributes_json,
    parentId: row.parent_id,
    active: row.active,
    version: row.version,
  };
}

function rowToPeriodontalMeasurement(
  row: PeriodontalMeasurementRow,
): PersistedPeriodontalMeasurement {
  const measurement: PersistedPeriodontalMeasurement = {
    id: row.id,
    tooth: row.tooth,
    site: row.site,
    measuredAt: row.measured_at,
  };
  if (row.probing_depth !== null) measurement.probingDepth = row.probing_depth;
  if (row.recession !== null) measurement.recession = row.recession;
  if (row.bleeding !== null) measurement.bleeding = row.bleeding;
  if (row.plaque !== null) measurement.plaque = row.plaque;
  if (row.suppuration !== null && row.suppuration !== undefined)
    measurement.suppuration = row.suppuration;
  if (row.mobility !== null) measurement.mobility = row.mobility;
  if (row.furcation !== null) measurement.furcation = row.furcation;
  return measurement;
}

export function parseOdontogramSnapshotPayload(row: OdontogramSnapshotRow): OdontogramSnapshot {
  const parsed = odontogramSnapshotSchema.safeParse({
    id: row.id,
    label: row.label,
    payloadJson: row.payload_json,
    createdAt: row.created_at,
    version: row.version ?? undefined,
  });
  if (!parsed.success) {
    throw new SupabaseRestError(
      "El snapshot odontológico tiene un payload incompatible con el esquema clínico actual.",
      502,
      { snapshotId: row.id, issues: parsed.error.issues },
    );
  }
  return parsed.data;
}

function rowToSnapshot(row: OdontogramSnapshotRow): OdontogramSnapshot {
  return parseOdontogramSnapshotPayload(row);
}

function currentPeriodontalMeasurements(
  rows: readonly PeriodontalMeasurementRow[],
): PeriodontalMeasurementRow[] {
  const latest = new Map<string, PeriodontalMeasurementRow>();
  for (const row of [...rows].sort((a, b) => {
    const versionDelta = (b.exam_version ?? -1) - (a.exam_version ?? -1);
    if (versionDelta !== 0) return versionDelta;
    return b.measured_at.localeCompare(a.measured_at);
  })) {
    const key = `${row.tooth}:${row.site}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  return [...latest.values()];
}

function maxVersion(rows: readonly DentalEntityRow[]): number {
  return Math.max(1, ...rows.map((row) => row.version));
}

function createRecordNumber(): string {
  return `DNT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto
    .randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}
