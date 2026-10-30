"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FeedbackNoteInput, FeedbackNoteStatus } from "@/shared/api";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query/keys";

export const feedbackKeys = {
  root: ["feedback-notes"] as const,
};

export function useFeedbackNotesQuery(enabled: boolean) {
  return useQuery({
    queryKey: feedbackKeys.root,
    queryFn: () => getBrowserApi().feedbackNotes.list(),
    enabled,
  });
}

/** Only admins triage the inbox; everyone else just reads and writes notes. */
export function useIsFeedbackAdmin() {
  const session = useQuery({
    queryKey: dentyQueryKeys.session,
    queryFn: () => getBrowserApi().auth.session(),
    staleTime: 60_000,
  });
  return session.data?.actor.role === "ADMIN";
}

export function useCreateFeedbackNoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FeedbackNoteInput) => getBrowserApi().feedbackNotes.create(input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: feedbackKeys.root }),
  });
}

export function useFeedbackNoteStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, status }: { noteId: string; status: FeedbackNoteStatus }) =>
      getBrowserApi().feedbackNotes.setStatus(noteId, status),
    onSettled: () => queryClient.invalidateQueries({ queryKey: feedbackKeys.root }),
  });
}
