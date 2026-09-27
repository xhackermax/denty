import { medicalProfileSchema, type CreatePatient, type Patient, type UpdatePatient } from "@/shared/api";
import type {
  OdontogramRecord,
  PersistedDentalEntity,
  PersistedPeriodontalMeasurement,
} from "@/shared/api/schemas/clinical";

import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";

interface ClinicRow {
  id: string;
}

interface PatientRow {
  id: string;
  clinic_id: string;
  legacy_id: number | null;
  record_number: string | null;
  first_name: string;
  last_name: string;
  dni: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  declared_source: string | null;
  declared_source_detail: string | null;
  photo_url: string | null;
  medical_profile: Record<string, unknown> | null;
  archived_at: string | null;
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

export class PatientRepository {
  private readonly clinicId?: string | undefined;
  private readonly allowedPatientIds?: readonly string[] | undefined;

  constructor(
    private readonly client: SupabaseRestClient,
    defaultClinicId?: string,
    options: { clinicId?: string | undefined; allowedPatientIds?: readonly string[] | undefined } = {},
  ) {
    this.clinicId = options.clinicId ?? defaultClinicId;
    this.allowedPatientIds = options.allowedPatientIds;
  }

  async listPatients() {
    const query: Record<string, string | number | undefined> = {
      select: "*",
      order: "created_at.desc",
    };
    if (this.clinicId) query.clinic_id = `eq.${this.clinicId}`;
    const rows = await this.client.select<PatientRow>("patients", query);
    const items = rows
      .filter((row) => this.canReadPatient(row.id))
      .map(rowToPatient);
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
      record_number: createRecordNumber(),
      first_name: payload.firstName,
      last_name: payload.lastName,
      dni: payload.dni ?? null,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      birth_date: payload.birthDate ?? null,
      declared_source: payload.declaredSource ?? null,
      declared_source_detail: payload.declaredSourceDetail ?? null,
      medical_profile: payload.medicalProfile ?? {},
    });
    const confirmed = await this.getPatient(row.id);
    if (!confirmed) {
      throw new SupabaseRestError("Supabase no confirmo la ficha creada en lectura posterior.", 502, {
        insertedPatientId: row.id,
      });
    }
    return confirmed;
  }

  async updatePatient(id: string, payload: UpdatePatient): Promise<Patient> {
    const body: Record<string, unknown> = {
      version: payload.expectedVersion + 1,
      updated_at: new Date().toISOString(),
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
        order: "measured_at.asc",
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
      periodontal: periodontal.map(rowToPeriodontalMeasurement),
      snapshots: snapshots.map(rowToSnapshot),
    };
  }

  async saveOdontogramBatch(patientId: string, input: OdontogramBatchInput) {
    const patient = await this.getPatient(patientId);
    if (!patient) return null;
    const current = await this.getOdontogram(patientId);
    if (!current) return null;
    if (current.version !== input.expectedVersion) {
      return { conflict: true as const, currentVersion: current.version };
    }

    const nextVersion = input.expectedVersion + 1;
    await this.client.patchMany(
      "dental_entities",
      { patient_id: `eq.${patientId}`, active: "eq.true" },
      { active: false, updated_at: new Date().toISOString() },
    );

    const rows = await Promise.all(
      input.entities
        .filter((entity) => entity.active)
        .map((entity) =>
          this.client.insert<DentalEntityRow>("dental_entities", {
            clinic_id: patient.clinicId,
            patient_id: patient.id,
            tooth: entity.tooth ?? null,
            arch: entity.arch ?? null,
            entity_type: entity.entityType,
            status: entity.status,
            surfaces_json: entity.surfaces ?? null,
            attributes_json: entity.attributes ?? {},
            parent_id: null,
            active: true,
            version: nextVersion,
          }),
        ),
    );

    await this.client.insert("clinical_history_events", {
      clinic_id: patient.clinicId,
      patient_id: patient.id,
      event_type: "ODONTOGRAM_BATCH_SAVED",
      entity_type: "ODONTOGRAM",
      payload_json: { version: nextVersion, entityCount: rows.length },
    });

    return {
      entities: rows.map(rowToDentalEntity),
      version: nextVersion,
    };
  }

  async getProjection(patientId: string) {
    const patient = await this.getPatient(patientId);
    if (!patient) return null;
    return {
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone ?? null,
        email: patient.email ?? null,
      },
      acquisitionSourceAnswered: Boolean(patient.declaredSource),
      appointments: [],
      plan: null,
      budgets: [],
      documents: [],
      prescriptions: [],
    };
  }

  private async resolveClinicId(): Promise<string> {
    if (this.clinicId) return this.clinicId;
    const clinics = await this.client.select<ClinicRow>("clinics", {
      select: "id",
      order: "created_at.asc",
      limit: 1,
    });
    const clinic = clinics[0];
    if (clinic) return clinic.id;
    const created = await this.client.insert<ClinicRow>("clinics", { name: "Denty" });
    return created.id;
  }

  private canReadPatient(patientId: string) {
    return !this.allowedPatientIds || this.allowedPatientIds.includes(patientId);
  }
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
  if (row.mobility !== null) measurement.mobility = row.mobility;
  if (row.furcation !== null) measurement.furcation = row.furcation;
  return measurement;
}

function rowToSnapshot(row: OdontogramSnapshotRow) {
  return {
    id: row.id,
    label: row.label,
    payloadJson: row.payload_json,
    createdAt: row.created_at,
    version: row.version ?? 1,
    entities: [],
    periodontal: [],
  };
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
