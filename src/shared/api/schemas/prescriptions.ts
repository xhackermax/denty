import { z } from "zod";

import { idSchema, prescriptionMedicationSchema, prescriptionSchema } from "../contracts";

const optionalTextSchema = z.string().trim().min(1).optional();

export const prescriptionClinicSettingsInputSchema = z.object({
  commercialName: optionalTextSchema,
  legalName: optionalTextSchema,
  taxId: optionalTextSchema,
  address: optionalTextSchema,
  city: optionalTextSchema,
  province: optionalTextSchema,
  postalCode: optionalTextSchema,
  country: optionalTextSchema,
  phone: optionalTextSchema,
  email: z.string().email().optional(),
  logoDataUrl: optionalTextSchema,
  providerKey: optionalTextSchema,
  externalClinicId: optionalTextSchema,
  providerEnabled: z.boolean().default(false),
  receptionCanDraft: z.boolean().default(true),
});

export const prescriptionPrescriberInputSchema = z.object({
  displayName: optionalTextSchema,
  professionalQualification: optionalTextSchema,
  licenseNumber: optionalTextSchema,
  specialty: optionalTextSchema,
  professionalPhone: optionalTextSchema,
  professionalEmail: z.string().email().optional(),
  professionalAddress: optionalTextSchema,
  providerKey: optionalTextSchema,
  externalPrescriberId: optionalTextSchema,
  enabled: z.boolean().default(false),
});

export const prescriptionSettingsSchema = z
  .object({
    clinic: z.object({ id: idSchema }).passthrough(),
    settings: z
      .object({
        providerEnabled: z.boolean().optional(),
        receptionCanDraft: z.boolean().optional(),
        providerKey: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable(),
    prescribers: z.array(
      z
        .object({
          id: idSchema,
          staffId: idSchema,
          displayName: z.string().min(1),
          enabled: z.boolean(),
        })
        .passthrough(),
    ),
    staff: z.array(
      z
        .object({
          id: idSchema,
          displayName: z.string().min(1),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export const createPrescriptionSchema = z.object({
  patientId: idSchema,
  prescriberStaffId: idSchema,
  siteId: idSchema.optional(),
  prescriptionDate: z.string().optional(),
  patientInformation: z.string().optional(),
  items: z.array(prescriptionMedicationSchema).default([]),
});

export const updatePrescriptionSchema = createPrescriptionSchema.partial();

export const prescriptionsSchema = z.object({
  items: z.array(prescriptionSchema.passthrough()),
});

export const cancelPrescriptionSchema = z.object({
  reason: z.string().trim().min(1),
});

export const signPrescriptionMetadataSchema = z.object({
  signerName: z.string().trim().min(1),
  evidence: z.record(z.string(), z.unknown()).optional(),
});

export const signPrescriptionSchema = signPrescriptionMetadataSchema.extend({
  signatureDataUrl: z
    .string()
    .regex(
      /^data:image\/(?:png|jpeg);base64,/,
      "La firma debe ser una imagen PNG o JPEG codificada en data URL.",
    ),
});

export const prescriptionHistorySchema = z.object({
  items: z.array(
    z.object({
      id: idSchema,
      version: z.number().int().positive(),
      status: z.string().min(1),
      snapshotJson: z.record(z.string(), z.unknown()),
      contentHash: z.string().regex(/^[a-f0-9]{64}$/),
      createdAt: z.string().min(1),
    }),
  ),
  signatures: z.array(
    z.object({
      id: idSchema,
      prescriptionVersionId: idSchema,
      signerName: z.string().min(1),
      checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
      mimeType: z.enum(["image/png", "image/jpeg"]),
      sizeBytes: z.number().int().positive(),
      signedAt: z.string().min(1),
    }),
  ),
});
