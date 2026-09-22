import { z } from "zod";

import type { ApiClient } from "../client";
import {
  auditVerificationSchema,
  backupCreationSchema,
  backupsSchema,
  createPrivacyRequestSchema,
  patientExportSchema,
  privacyRequestSchema,
  privacyRequestsSchema,
  securitySessionsSchema,
  updatePrivacyRequestSchema,
} from "../schemas/security";
import { encodeId } from "./shared";

const okSchema = z.object({ ok: z.literal(true) });
const backupVerificationSchema = z.object({}).passthrough();

export function createSecurityResource(client: ApiClient) {
  return {
    audit: {
      verify: () => client.request("/api/security/audit/verify", auditVerificationSchema),
    },
    sessions: {
      list: () => client.request("/api/security/sessions", securitySessionsSchema),
      revoke: (id: string) =>
        client.mutation(
          `/api/security/sessions/${encodeId(id)}`,
          okSchema,
          {},
          { method: "DELETE" },
        ),
    },
    backups: {
      list: () => client.request("/api/security/backups", backupsSchema),
      create: () => client.mutation("/api/security/backups", backupCreationSchema, {}),
      verify: (id: string) =>
        client.mutation(
          `/api/security/backups/${encodeId(id)}/verify`,
          backupVerificationSchema,
          {},
        ),
    },
    patientExport: (patientId: string) =>
      client.request(
        `/api/security/patient-export/${encodeId(patientId)}`,
        patientExportSchema,
      ),
    privacy: {
      list: () => client.request("/api/security/privacy-requests", privacyRequestsSchema),
      create: (payload: z.input<typeof createPrivacyRequestSchema>) =>
        client.mutation(
          "/api/security/privacy-requests",
          privacyRequestSchema,
          createPrivacyRequestSchema.parse(payload),
        ),
      update: (id: string, payload: z.input<typeof updatePrivacyRequestSchema>) =>
        client.mutation(
          `/api/security/privacy-requests/${encodeId(id)}`,
          privacyRequestSchema,
          updatePrivacyRequestSchema.parse(payload),
          { method: "PATCH" },
        ),
    },
  } as const;
}
