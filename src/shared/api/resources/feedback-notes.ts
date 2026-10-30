import type { ApiClient } from "../client";
import {
  feedbackNoteInputSchema,
  feedbackNoteListSchema,
  feedbackNoteSchema,
  feedbackNoteStatusInputSchema,
  type FeedbackNoteInput,
  type FeedbackNoteStatus,
} from "../schemas/feedback-notes";
import { encodeId } from "./shared";

/** Feedback inbox: notes about failures and improvements left by anyone trying the app. */
export function createFeedbackNotesResource(client: ApiClient) {
  return {
    list: () => client.request("/api/feedback-notes", feedbackNoteListSchema),
    create: (input: FeedbackNoteInput) =>
      client.mutation(
        "/api/feedback-notes",
        feedbackNoteSchema,
        feedbackNoteInputSchema.parse(input),
      ),
    setStatus: (noteId: string, status: FeedbackNoteStatus) =>
      client.mutation(
        `/api/feedback-notes/${encodeId(noteId)}/status`,
        feedbackNoteSchema,
        feedbackNoteStatusInputSchema.parse({ status }),
      ),
  };
}
