import { z } from "zod";

import { idSchema, isoDateTimeSchema } from "../contracts";

export const FEEDBACK_NOTE_KINDS = ["BUG", "IDEA", "OTHER"] as const;
export const FEEDBACK_NOTE_STATUSES = ["NEW", "REVIEWED", "DONE", "DISMISSED"] as const;

export type FeedbackNoteKind = (typeof FEEDBACK_NOTE_KINDS)[number];
export type FeedbackNoteStatus = (typeof FEEDBACK_NOTE_STATUSES)[number];

// Same limits as the feedback_notes constraints, so the form explains a bad value.
export const feedbackNoteInputSchema = z.object({
  kind: z.enum(FEEDBACK_NOTE_KINDS),
  message: z
    .string()
    .trim()
    .min(3, "Escribe al menos 3 caracteres.")
    .max(4000, "Máximo 4000 caracteres."),
  pagePath: z.string().trim().max(300).nullable(),
});

export const feedbackNoteStatusInputSchema = z.object({
  status: z.enum(FEEDBACK_NOTE_STATUSES),
});

export const feedbackNoteSchema = z.object({
  id: idSchema,
  kind: z.enum(FEEDBACK_NOTE_KINDS),
  message: z.string(),
  pagePath: z.string().nullable(),
  status: z.enum(FEEDBACK_NOTE_STATUSES),
  authorId: z.string().nullable(),
  authorName: z.string(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const feedbackNoteListSchema = z.array(feedbackNoteSchema);

export type FeedbackNoteInput = z.infer<typeof feedbackNoteInputSchema>;
export type FeedbackNote = z.infer<typeof feedbackNoteSchema>;
