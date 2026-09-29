import { PERMISSIONS, ROLES } from "@/domain/permissions";
import { z } from "zod";

export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const isoDateSchema = z.string().date();
export const versionSchema = z.number().int().positive();
export const idSchema = z.string().min(1);

export const roleSchema = z.enum(ROLES);

export const permissionSchema = z.enum(PERMISSIONS);

export const apiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    correlationId: z.string().min(1).optional(),
    details: z.unknown().optional(),
  }),
});

export function pageSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });
}

export const patientAcquisitionSourceSchema = z.enum([
  "GOOGLE",
  "INSTAGRAM",
  "FACEBOOK",
  "PATIENT_REFERRAL",
  "PROFESSIONAL_REFERRAL",
  "WALK_IN",
  "EXISTING_PATIENT",
  "OTHER",
]);

export const medicalProfileSchema = z.object({
  allergies: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  dentalRisks: z.array(z.string()).default([]),
  notes: z.string().default(""),
  dentitionStage: z.enum(["primary", "mixed", "permanent"]).default("permanent"),
});

export const patientSchema = z.object({
  id: idSchema,
  clinicId: idSchema,
  legacyId: z.number().int().positive().nullable().optional(),
  recordNumber: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dni: z.string().min(1).nullable().optional(),
  phone: z.string().min(1).nullable().optional(),
  email: z.string().email().nullable().optional(),
  birthDate: isoDateSchema.nullable().optional(),
  declaredSource: patientAcquisitionSourceSchema.nullable().optional(),
  declaredSourceDetail: z.string().max(200).nullable().optional(),
  photoUrl: z.string().trim().min(1).max(500).nullable().optional(),
  lastVisitAt: isoDateTimeSchema.nullable().optional(),
  nextVisitAt: isoDateTimeSchema.nullable().optional(),
  archivedAt: isoDateTimeSchema.nullable().optional(),
  archivedReason: z.string().nullable().optional(),
  version: versionSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  medicalProfile: medicalProfileSchema.optional(),
});

export const createPatientSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  recordNumber: z.string().trim().min(1).optional(),
  dni: z.string().trim().min(1).nullable().optional(),
  phone: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  birthDate: isoDateSchema.optional(),
  declaredSource: patientAcquisitionSourceSchema.optional(),
  declaredSourceDetail: z.string().max(200).optional(),
  declaredCampaignId: idSchema.optional(),
  medicalProfile: medicalProfileSchema.optional(),
});

export const updatePatientSchema = createPatientSchema
  .omit({ recordNumber: true, declaredCampaignId: true })
  .partial()
  .extend({
    expectedVersion: versionSchema,
  });

export const archivePatientSchema = z.object({
  expectedVersion: versionSchema,
  reason: z.string().trim().max(500).optional(),
});

export const restorePatientSchema = z.object({
  expectedVersion: versionSchema,
});

export const patientLifecycleResultSchema = z.object({
  conflict: z.boolean(),
  id: idSchema.optional(),
  version: versionSchema.optional(),
  archivedAt: isoDateTimeSchema.nullable().optional(),
  archivedReason: z.string().nullable().optional(),
});

export const appointmentStatusSchema = z.enum([
  "PLANNED",
  "CONFIRMED",
  "ARRIVED",
  "WAITING",
  "IN_CHAIR",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
  "RUNNING_LATE",
]);

/** Read-only clinical context resolved from the linked plan item (never stored twice). */
export const appointmentClinicalSchema = z.object({
  tooth: z.string().nullable().optional(),
  treatmentCode: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  surfaces: z.array(z.string()).optional(),
});

export const appointmentSchema = z.object({
  id: idSchema,
  clinicId: idSchema,
  patientId: idSchema,
  staffId: idSchema,
  siteId: idSchema,
  cabinetId: idSchema.nullable().optional(),
  clinicalPlanItemId: idSchema.optional(),
  rescheduledFromId: idSchema.optional(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  status: appointmentStatusSchema,
  title: z.string().min(1),
  reason: z.string().min(1).nullable().optional(),
  version: versionSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  clinical: appointmentClinicalSchema.optional(),
});

export const createAppointmentSchema = z.object({
  patientId: idSchema,
  staffId: idSchema,
  siteId: idSchema,
  cabinetId: idSchema.nullable().optional(),
  clinicalPlanItemId: idSchema.optional(),
  rescheduledFromId: idSchema.optional(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  title: z.string().min(1),
  reason: z.string().min(1).optional(),
});

export const updateAppointmentSchema = createAppointmentSchema
  .omit({ rescheduledFromId: true })
  .partial()
  .extend({
    expectedVersion: versionSchema,
    status: appointmentStatusSchema.optional(),
  });

export const labStatusSchema = z.enum([
  "PLANNED",
  "IMPRESSION_TAKEN",
  "SCANNED",
  "SENT",
  "IN_PRODUCTION",
  "TRIAL",
  "RECEIVED",
  "PLACED",
  "INCIDENT",
  "CANCELLED",
]);

export const labWorkSchema = z
  .object({
    id: idSchema,
    patientId: idSchema,
    laboratoryId: idSchema.nullable().optional(),
    clinicalPlanItemId: idSchema.nullable().optional(),
    appointmentId: idSchema.nullable().optional(),
    dentalEntityId: idSchema.nullable().optional(),
    siteId: idSchema.nullable().optional(),
    title: z.string().min(1),
    status: labStatusSchema,
    category: z.string().nullable().optional(),
    toothOrZone: z.string().nullable().optional(),
    etaAt: isoDateTimeSchema.nullable().optional(),
    sentAt: isoDateTimeSchema.nullable().optional(),
    receivedAt: isoDateTimeSchema.nullable().optional(),
    placedAt: isoDateTimeSchema.nullable().optional(),
    notes: z.string().nullable().optional(),
    costCents: z.number().int().nonnegative().default(0),
    version: versionSchema,
    createdAt: isoDateTimeSchema.optional(),
    updatedAt: isoDateTimeSchema.optional(),
    patient: z
      .object({ id: idSchema, firstName: z.string().min(1), lastName: z.string().min(1) })
      .optional(),
    lab: z
      .object({ id: idSchema, name: z.string().min(1) })
      .nullable()
      .optional(),
    attachments: z
      .array(
        z
          .object({
            id: idSchema,
            fileName: z.string().min(1),
            mimeType: z.string().min(1),
            sizeBytes: z.number().int().positive().optional(),
            sha256: z
              .string()
              .regex(/^[a-f0-9]{64}$/)
              .optional(),
            createdAt: isoDateTimeSchema.optional(),
          })
          .strict(),
      )
      .default([]),
    statusEvents: z
      .array(
        z
          .object({
            id: idSchema,
            fromStatus: z.string().nullable().optional(),
            toStatus: z.string().min(1),
            note: z.string().nullable().optional(),
            changedAt: isoDateTimeSchema,
          })
          .strict(),
      )
      .default([]),
    reworks: z
      .array(
        z
          .object({
            id: idSchema,
            reason: z.string().min(1),
            costCents: z.number().int().nonnegative(),
            etaAt: isoDateTimeSchema.nullable().optional(),
            createdAt: isoDateTimeSchema,
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

export const createLabWorkSchema = z.object({
  patientId: idSchema,
  laboratoryId: idSchema.optional(),
  clinicalPlanItemId: idSchema.optional(),
  appointmentId: idSchema.optional(),
  dentalEntityId: idSchema.optional(),
  staffId: idSchema.optional(),
  siteId: idSchema.optional(),
  labId: idSchema.optional(),
  title: z.string().min(1),
  category: z.string().optional(),
  toothOrZone: z.string().optional(),
  etaAt: isoDateTimeSchema.optional(),
  costCents: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
});

export const labTransitionSchema = z.object({
  status: labStatusSchema,
  note: z.string().optional(),
  expectedVersion: versionSchema,
});

export const documentSchema = z.object({
  id: idSchema,
  patientId: idSchema,
  type: z.string().min(1),
  title: z.string().min(1),
  status: z.string().min(1),
  fileName: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  checksum: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable()
    .optional(),
  version: z.number().int().positive(),
  previousVersionId: idSchema.nullable().optional(),
  fileSizeBytes: z.number().int().nonnegative().nullable().optional(),
  templateId: idSchema.nullable().optional(),
  signerName: z.string().nullable().optional(),
  signedAt: z.string().nullable().optional(),
  createdAt: isoDateTimeSchema,
});

export const createDocumentSchema = z.object({
  patientId: idSchema,
  templateId: idSchema.optional(),
  type: z.string().min(1),
  title: z.string().min(1),
  data: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).default({}),
});

export const signDocumentSchema = z.object({
  signerName: z.string().trim().min(2),
  /** PNG/JPEG data URL captured by SignaturePad; sent to the server as multipart. */
  signatureDataUrl: z.string().regex(/^data:image\/(png|jpeg);/),
});

export const signDocumentMetadataSchema = z.object({
  signerName: z.string().trim().min(2).max(160),
});

export const paymentMethodSchema = z.enum(["CASH", "CARD", "TRANSFER", "FINANCING", "OTHER"]);

export const recordPaymentSchema = z.object({
  patientId: idSchema,
  invoiceId: idSchema.optional(),
  budgetId: idSchema.optional(),
  amountCents: z.number().int().positive(),
  method: paymentMethodSchema,
  reference: z.string().optional(),
  provider: z.enum(["manual", "sumup", "stripe", "bank_terminal"]).optional(),
  providerTransactionId: z.string().optional(),
  idempotencyKey: z.string().min(8).max(160).optional(),
});

export const paymentSchema = recordPaymentSchema.extend({
  id: idSchema,
  createdAt: isoDateTimeSchema,
});

export const prescriptionStatusSchema = z.enum([
  "DRAFT",
  "READY",
  "SIGNING",
  "ISSUED",
  "DISPENSED_PARTIAL",
  "DISPENSED",
  "CANCELLED",
  "FAILED",
  "EXPIRED",
]);

export const prescriptionMedicationSchema = z.object({
  activeIngredient: z.string().min(1).optional(),
  brandName: z.string().optional(),
  strength: z.string().min(1),
  pharmaceuticalForm: z.string().min(1),
  route: z.string().optional(),
  unitsPerDose: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().min(1),
  startDate: z.string().optional(),
  packageFormat: z.string().optional(),
  packageCount: z.string().optional(),
  instructions: z.string().optional(),
  internalIndication: z.string().optional(),
});

export const prescriptionSchema = z
  .object({
    id: idSchema,
    patientId: idSchema,
    prescriberStaffId: idSchema.optional(),
    status: prescriptionStatusSchema,
    items: z.array(prescriptionMedicationSchema),
    patientSnapshotJson: z.record(z.string(), z.unknown()).optional(),
    prescriberSnapshotJson: z.record(z.string(), z.unknown()).optional(),
    version: versionSchema.optional(),
    createdAt: isoDateTimeSchema,
  })
  .passthrough();

export const attendanceStatusSchema = z.object({
  active: z.boolean(),
  openedAt: isoDateTimeSchema.nullable().optional(),
  accumulatedMinutes: z.number().int().nonnegative().default(0),
});

export const notificationSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  message: z.string().min(1),
  read: z.boolean(),
  createdAt: isoDateTimeSchema,
});

export const loginRequestSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  deviceLabel: z.string().max(120).optional(),
  clinicId: idSchema.optional(),
});

export const passwordResetRequestSchema = z.object({
  identifier: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const loginResponseSchema = z.object({
  user: z.object({
    id: idSchema,
    displayName: z.string().min(1),
    role: roleSchema,
  }),
});

export const actorContextSchema = z.object({
  userId: idSchema,
  clinicId: idSchema,
  role: roleSchema,
  staffId: idSchema.optional(),
  patientIds: z.array(idSchema).optional(),
  permissions: z.array(permissionSchema),
  sessionId: idSchema,
});

export const sessionResponseSchema = z.object({
  actor: actorContextSchema,
  permissions: z.array(permissionSchema),
});

export const authSessionSchema = z.object({
  id: idSchema,
  device: z.string().min(1),
  lastSeenAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
  current: z.boolean(),
  revoked: z.boolean(),
});

export const authSessionsSchema = z.object({ items: z.array(authSessionSchema) });

export const eventEnvelopeSchema = z.object({
  id: idSchema,
  type: z.string().min(1),
  entityId: idSchema.optional(),
  version: z.number().int().nonnegative().optional(),
  payload: z.unknown().optional(),
});

export type Patient = z.infer<typeof patientSchema>;
export type CreatePatient = z.infer<typeof createPatientSchema>;
export type UpdatePatient = z.infer<typeof updatePatientSchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
export type CreateAppointment = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;
export type LabWork = z.infer<typeof labWorkSchema>;
export type CreateLabWork = z.infer<typeof createLabWorkSchema>;
export type LabTransition = z.infer<typeof labTransitionSchema>;
export type RecordPayment = z.infer<typeof recordPaymentSchema>;
export type Prescription = z.infer<typeof prescriptionSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type DentyEvent = z.infer<typeof eventEnvelopeSchema>;
