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

export const backupStatusItemSchema = z.object({
  id: idSchema,
  createdAt: z.string().nullable(),
  status: z.string().nullable(),
  type: z.string().nullable(),
});

export const backupsSchema = z.object({
  provider: z.literal("SUPABASE_MANAGED"),
  configured: z.boolean(),
  pitrEnabled: z.boolean().nullable(),
  backups: z.array(backupStatusItemSchema),
  message: z.string().nullable(),
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

export const privacyRequestStatusSchema = z.enum(["PENDING", "IN_REVIEW", "COMPLETED", "REJECTED"]);

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
