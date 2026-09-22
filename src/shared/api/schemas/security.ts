import { z } from "zod";

import { idSchema } from "../contracts";

export const securitySessionSchema = z.object({
  id: idSchema,
  createdAt: z.coerce.string(),
  lastSeenAt: z.coerce.string(),
  expiresAt: z.coerce.string(),
  deviceLabel: z.string().nullable().optional(),
});

export const securitySessionsSchema = z.object({
  items: z.array(securitySessionSchema),
});

export const backupRecordSchema = z
  .object({
    id: idSchema,
    sha256: z.string().min(1),
    encrypted: z.boolean(),
    sizeBytes: z.number().int().nonnegative(),
    verifiedAt: z.coerce.string().nullable().optional(),
    createdAt: z.coerce.string().optional(),
  })
  .passthrough();

export const backupsSchema = z.object({ items: z.array(backupRecordSchema) });

export const backupCreationSchema = z.object({
  backup: backupRecordSchema,
  verification: z.unknown(),
});

export const auditVerificationSchema = z
  .object({
    ok: z.boolean(),
  })
  .passthrough();

export const privacyRequestTypeSchema = z.enum([
  "ACCESS",
  "EXPORT",
  "RECTIFICATION",
  "RESTRICTION",
  "ERASURE",
]);

export const privacyRequestStatusSchema = z.enum([
  "PENDING",
  "IN_REVIEW",
  "COMPLETED",
  "REJECTED",
]);

export const privacyRequestSchema = z
  .object({
    id: idSchema,
    patientId: idSchema,
    type: privacyRequestTypeSchema,
    status: privacyRequestStatusSchema,
    requestNote: z.string().nullable().optional(),
    resolutionNote: z.string().nullable().optional(),
  })
  .passthrough();

export const privacyRequestsSchema = z.object({
  items: z.array(privacyRequestSchema),
});

export const createPrivacyRequestSchema = z.object({
  patientId: idSchema,
  type: privacyRequestTypeSchema,
  note: z.string().optional(),
});

export const updatePrivacyRequestSchema = z.object({
  status: z.enum(["IN_REVIEW", "COMPLETED", "REJECTED"]),
  resolutionNote: z.string().optional(),
});

export const patientExportSchema = z
  .object({
    exportedAt: z.coerce.string(),
    patient: z.object({ id: idSchema }).passthrough(),
  })
  .passthrough();
