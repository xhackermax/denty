import { z } from "zod";

import type { ApiClient } from "../client";
import { withQuery } from "./shared";

const candidateCvSchema = z.object({
  id: z.string().uuid(),
  candidateName: z.string(),
  targetPosition: z.string().nullable(),
  notes: z.string().nullable(),
  fileName: z.string(),
  fileSizeBytes: z.number().int().positive(),
  checksum: z.string(),
  createdAt: z.string(),
});

export type CandidateCv = z.infer<typeof candidateCvSchema>;

export function createCvArchiveResource(client: ApiClient) {
  return {
    list: () =>
      client.request("/api/cv-archive", z.object({ items: z.array(candidateCvSchema) })),
    upload: (input: {
      candidateName: string;
      targetPosition?: string;
      notes?: string;
      file: File;
    }) => {
      const form = new FormData();
      form.set("candidateName", input.candidateName);
      form.set("targetPosition", input.targetPosition ?? "");
      form.set("notes", input.notes ?? "");
      form.set("file", input.file);
      return client.upload("/api/cv-archive", candidateCvSchema, form);
    },
    remove: (id: string) =>
      client.mutation("/api/cv-archive", z.object({ ok: z.literal(true) }), { id }, { method: "DELETE" }),
    download: (id: string) =>
      client.requestBlob(withQuery("/api/cv-archive", { id }), {
        headers: { accept: "application/pdf" },
      }),
  } as const;
}
