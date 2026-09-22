"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateLabWork, LabTransition } from "@/shared/api";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";

export function useLaboratoryQuery(enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.laboratory.all,
    queryFn: () => getBrowserApi().laboratory.list(),
    enabled,
  });
}

export function useCreateLabWorkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLabWork) =>
      getBrowserApi().laboratory.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dentyQueryKeys.laboratory.all,
      });
    },
  });
}

export function useLabTransitionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; payload: LabTransition }) =>
      getBrowserApi().laboratory.transition(input.id, input.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dentyQueryKeys.laboratory.all,
      });
    },
  });
}

export function useLabReworkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      reason: string;
      costCents?: number;
      etaAt?: string;
    }) =>
      getBrowserApi().laboratory.rework(input.id, {
        reason: input.reason,
        ...(input.costCents !== undefined ? { costCents: input.costCents } : {}),
        ...(input.etaAt ? { etaAt: input.etaAt } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dentyQueryKeys.laboratory.all,
      });
    },
  });
}

export function useLabAttachmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      fileName: string;
      mimeType: string;
      base64: string;
    }) =>
      getBrowserApi().laboratory.addAttachment(input.id, {
        fileName: input.fileName,
        mimeType: input.mimeType,
        base64: input.base64,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dentyQueryKeys.laboratory.all,
      });
    },
  });
}
