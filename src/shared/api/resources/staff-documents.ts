import { z } from "zod";

import type { ApiClient } from "../client";
import { withQuery } from "./shared";

export const staffDocumentKindSchema = z.enum(["CV", "CONTRACT"]);

const staffDocumentSchema = z.object({
  id: z.string().uuid(),
  staffMemberId: z.string().uuid(),
  type: staffDocumentKindSchema,
  title: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number().int().positive(),
  checksum: z.string(),
  createdAt: z.string(),
});

const staffDocumentsSchema = z.object({ items: z.array(staffDocumentSchema) });

export type StaffDocumentKind = z.infer<typeof staffDocumentKindSchema>;
export type StaffDocument = z.infer<typeof staffDocumentSchema>;

export function createStaffDocumentsResource(client: ApiClient) {
  return {
    list: (kind: StaffDocumentKind) =>
      client.request(withQuery("/api/staff-documents", { type: kind }), staffDocumentsSchema),
    upload: (input: { staffMemberId: string; type: StaffDocumentKind; title: string; file: File }) => {
      const form = new FormData();
      form.set("staffMemberId", input.staffMemberId);
      form.set("type", input.type);
      form.set("title", input.title);
      form.set("file", input.file);
      return client.upload("/api/staff-documents", staffDocumentSchema, form);
    },
  } as const;
}
