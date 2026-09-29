import type { z } from "zod";

import type {
  createPrescriptionSchema,
  prescriptionClinicSettingsInputSchema,
  prescriptionPrescriberInputSchema,
  updatePrescriptionSchema,
} from "@/shared/api/schemas/prescriptions";

import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";

type CreatePrescription = z.input<typeof createPrescriptionSchema>;
type UpdatePrescription = z.input<typeof updatePrescriptionSchema>;
type ClinicSettingsInput = z.input<typeof prescriptionClinicSettingsInputSchema>;
type PrescriberInput = z.input<typeof prescriptionPrescriberInputSchema>;

interface PrescriptionRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  prescriber_staff_id: string | null;
  site_id: string | null;
  status: string;
  prescription_date: string;
  patient_information: string | null;
  patient_snapshot_json: Record<string, unknown> | null;
  prescriber_snapshot_json: Record<string, unknown> | null;
  provider_key: string | null;
  provider_reference: string | null;
  issued_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PrescriptionItemRow {
  id: string;
  prescription_id: string;
  line_no: number;
  active_ingredient: string | null;
  brand_name: string | null;
  strength: string;
  pharmaceutical_form: string;
  route: string | null;
  units_per_dose: string;
  frequency: string;
  duration: string;
  start_date: string | null;
  package_format: string | null;
  package_count: string | null;
  instructions: string | null;
  internal_indication: string | null;
}

interface ClinicSettingsRow {
  clinic_id: string;
  commercial_name: string | null;
  legal_name: string | null;
  tax_id: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  logo_storage_path: string | null;
  provider_key: string | null;
  external_clinic_id: string | null;
  provider_enabled: boolean;
  reception_can_draft: boolean;
  version: number;
  updated_at: string;
}

interface PrescriberRow {
  id: string;
  clinic_id: string;
  staff_id: string;
  display_name: string;
  professional_qualification: string | null;
  license_number: string | null;
  specialty: string | null;
  professional_phone: string | null;
  professional_email: string | null;
  professional_address: string | null;
  provider_key: string | null;
  external_prescriber_id: string | null;
  enabled: boolean;
  version: number;
  updated_at: string;
}

interface StaffRow {
  id: string;
  display_name: string;
  active: boolean;
}

interface SignatureRow {
  id: string;
  prescription_id: string;
  prescription_version_id: string;
  signer_name: string;
  storage_path: string;
  checksum_sha256: string;
  mime_type: string;
  size_bytes: number;
  signed_at: string;
}

interface PrescriptionVersionRow {
  id: string;
  prescription_id: string;
  version: number;
  status: string;
  snapshot_json: Record<string, unknown>;
  content_hash: string;
  created_at: string;
}

const medication = (row: PrescriptionItemRow) => ({
  ...(row.active_ingredient ? { activeIngredient: row.active_ingredient } : {}),
  ...(row.brand_name ? { brandName: row.brand_name } : {}),
  strength: row.strength,
  pharmaceuticalForm: row.pharmaceutical_form,
  ...(row.route ? { route: row.route } : {}),
  unitsPerDose: row.units_per_dose,
  frequency: row.frequency,
  duration: row.duration,
  ...(row.start_date ? { startDate: row.start_date } : {}),
  ...(row.package_format ? { packageFormat: row.package_format } : {}),
  ...(row.package_count ? { packageCount: row.package_count } : {}),
  ...(row.instructions ? { instructions: row.instructions } : {}),
  ...(row.internal_indication ? { internalIndication: row.internal_indication } : {}),
});

const clinicSettings = (row: ClinicSettingsRow) => ({
  id: row.clinic_id,
  clinicId: row.clinic_id,
  commercialName: row.commercial_name,
  legalName: row.legal_name,
  taxId: row.tax_id,
  address: row.address,
  city: row.city,
  province: row.province,
  postalCode: row.postal_code,
  country: row.country,
  phone: row.phone,
  email: row.email,
  logoStoragePath: row.logo_storage_path,
  providerKey: row.provider_key,
  externalClinicId: row.external_clinic_id,
  providerEnabled: row.provider_enabled,
  receptionCanDraft: row.reception_can_draft,
  version: row.version,
  updatedAt: row.updated_at,
});

const prescriber = (row: PrescriberRow) => ({
  id: row.id,
  staffId: row.staff_id,
  displayName: row.display_name,
  professionalQualification: row.professional_qualification,
  licenseNumber: row.license_number,
  specialty: row.specialty,
  professionalPhone: row.professional_phone,
  professionalEmail: row.professional_email,
  professionalAddress: row.professional_address,
  providerKey: row.provider_key,
  externalPrescriberId: row.external_prescriber_id,
  enabled: row.enabled,
  version: row.version,
  updatedAt: row.updated_at,
});

export class PrescriptionRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}

  private async materialize(row: PrescriptionRow) {
    const items = await this.client.select<PrescriptionItemRow>("prescription_items", {
      select: "*",
      prescription_id: `eq.${row.id}`,
      order: "line_no.asc",
    });
    return {
      id: row.id,
      patientId: row.patient_id,
      ...(row.prescriber_staff_id ? { prescriberStaffId: row.prescriber_staff_id } : {}),
      ...(row.site_id ? { siteId: row.site_id } : {}),
      status: row.status,
      prescriptionDate: row.prescription_date,
      patientInformation: row.patient_information,
      items: items.map(medication),
      ...(row.patient_snapshot_json ? { patientSnapshotJson: row.patient_snapshot_json } : {}),
      ...(row.prescriber_snapshot_json
        ? { prescriberSnapshotJson: row.prescriber_snapshot_json }
        : {}),
      providerKey: row.provider_key,
      providerReference: row.provider_reference,
      issuedAt: row.issued_at,
      cancelledAt: row.cancelled_at,
      cancelReason: row.cancel_reason,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async list(patientId?: string) {
    const rows = await this.client.select<PrescriptionRow>("prescriptions", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      ...(patientId ? { patient_id: `eq.${patientId}` } : {}),
      order: "created_at.desc",
    });
    return { items: await Promise.all(rows.map((row) => this.materialize(row))) };
  }

  async get(id: string) {
    const rows = await this.client.select<PrescriptionRow>("prescriptions", {
      select: "*",
      id: `eq.${id}`,
      clinic_id: `eq.${this.clinicId}`,
      limit: 1,
    });
    const row = rows[0];
    if (!row) throw new SupabaseRestError("Receta no encontrada.", 404, { id });
    return this.materialize(row);
  }

  async history(id: string) {
    await this.get(id);
    const [versions, signatures] = await Promise.all([
      this.client.select<PrescriptionVersionRow>("prescription_versions", {
        select: "id,prescription_id,version,status,snapshot_json,content_hash,created_at",
        prescription_id: `eq.${id}`,
        order: "version.desc",
      }),
      this.client.select<SignatureRow>("prescription_signatures", {
        select:
          "id,prescription_id,prescription_version_id,signer_name,storage_path,checksum_sha256,mime_type,size_bytes,signed_at",
        prescription_id: `eq.${id}`,
        order: "signed_at.desc",
      }),
    ]);
    return {
      items: versions.map((row) => ({
        id: row.id,
        version: row.version,
        status: row.status,
        snapshotJson: row.snapshot_json,
        contentHash: row.content_hash,
        createdAt: row.created_at,
      })),
      signatures: signatures.map((row) => ({
        id: row.id,
        prescriptionVersionId: row.prescription_version_id,
        signerName: row.signer_name,
        checksumSha256: row.checksum_sha256,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        signedAt: row.signed_at,
      })),
    };
  }

  async create(input: CreatePrescription) {
    const row = await this.client.rpc<PrescriptionRow>("create_prescription_draft", {
      p_clinic_id: this.clinicId,
      p_patient_id: input.patientId,
      p_prescriber_staff_id: input.prescriberStaffId,
      p_site_id: input.siteId ?? null,
      p_prescription_date: input.prescriptionDate ?? null,
      p_patient_information: input.patientInformation ?? null,
      p_items: input.items ?? [],
    });
    return this.materialize(row);
  }

  async update(id: string, input: UpdatePrescription) {
    const current = await this.get(id);
    const row = await this.client.rpc<PrescriptionRow>("update_prescription_draft", {
      p_prescription_id: id,
      p_expected_version: current.version ?? 1,
      p_prescriber_staff_id: input.prescriberStaffId ?? null,
      p_site_id: input.siteId ?? null,
      p_prescription_date: input.prescriptionDate ?? null,
      p_patient_information: input.patientInformation ?? null,
      p_items: input.items ?? null,
    });
    return this.materialize(row);
  }

  async validate(id: string) {
    const row = await this.client.rpc<PrescriptionRow>("validate_prescription", {
      p_prescription_id: id,
    });
    return this.materialize(row);
  }

  async recordSignature(input: {
    prescriptionId: string;
    signerName: string;
    storagePath: string;
    checksum: string;
    mimeType: string;
    sizeBytes: number;
    evidence?: Record<string, unknown>;
  }) {
    return this.client.rpc<SignatureRow>("record_prescription_signature", {
      p_prescription_id: input.prescriptionId,
      p_signer_name: input.signerName,
      p_storage_path: input.storagePath,
      p_checksum_sha256: input.checksum,
      p_mime_type: input.mimeType,
      p_size_bytes: input.sizeBytes,
      p_evidence_json: input.evidence ?? {},
    });
  }

  async issue(id: string) {
    const row = await this.client.rpc<PrescriptionRow>("issue_prescription", {
      p_prescription_id: id,
    });
    return this.materialize(row);
  }

  async cancel(id: string, reason: string) {
    const row = await this.client.rpc<PrescriptionRow>("cancel_prescription", {
      p_prescription_id: id,
      p_reason: reason,
    });
    return this.materialize(row);
  }

  async settings() {
    const [settingsRows, prescriberRows, staffRows] = await Promise.all([
      this.client.select<ClinicSettingsRow>("prescription_clinic_settings", {
        select: "*",
        clinic_id: `eq.${this.clinicId}`,
        limit: 1,
      }),
      this.client.select<PrescriberRow>("prescription_prescribers", {
        select: "*",
        clinic_id: `eq.${this.clinicId}`,
        order: "display_name.asc",
      }),
      this.client.select<StaffRow>("staff_members", {
        select: "id,display_name,active",
        clinic_id: `eq.${this.clinicId}`,
        active: "eq.true",
        order: "display_name.asc",
      }),
    ]);
    return {
      clinic: { id: this.clinicId },
      settings: settingsRows[0] ? clinicSettings(settingsRows[0]) : null,
      prescribers: prescriberRows.map(prescriber),
      staff: staffRows.map((staff) => ({ id: staff.id, displayName: staff.display_name })),
    };
  }

  async updateClinicSettings(input: ClinicSettingsInput) {
    const row = await this.client.rpc<ClinicSettingsRow>("update_prescription_clinic_settings", {
      p_clinic_id: this.clinicId,
      p_payload: input,
    });
    return clinicSettings(row);
  }

  async updatePrescriber(staffId: string, input: PrescriberInput) {
    const row = await this.client.rpc<PrescriberRow>("update_prescription_prescriber", {
      p_clinic_id: this.clinicId,
      p_staff_id: staffId,
      p_payload: input,
    });
    return prescriber(row);
  }
}
