"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";

import {
  createPrescriptionSchema,
  type Prescription,
} from "@/shared/api";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";

function invalidatePrescriptions(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.prescriptions.all });
}

export function usePrescriptionsQuery(enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.prescriptions.all,
    queryFn: () => getBrowserApi().prescriptions.list(),
    enabled,
  });
}

export function usePrescriptionSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.prescriptions.settings,
    queryFn: () => getBrowserApi().prescriptions.settings.get(),
    enabled,
  });
}

export function useCreatePrescriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: z.input<typeof createPrescriptionSchema>) =>
      getBrowserApi().prescriptions.create(payload),
    onSuccess: () => invalidatePrescriptions(queryClient),
  });
}

export function useValidatePrescriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prescription: Prescription) =>
      getBrowserApi().prescriptions.validate(prescription.id),
    onSuccess: () => invalidatePrescriptions(queryClient),
  });
}

export function useIssuePrescriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prescription: Prescription) =>
      getBrowserApi().prescriptions.issue(prescription.id),
    onSuccess: () => invalidatePrescriptions(queryClient),
  });
}

export function useCancelPrescriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      getBrowserApi().prescriptions.cancel(input.id, input.reason),
    onSuccess: () => invalidatePrescriptions(queryClient),
  });
}

export async function openPrescriptionPdf(id: string): Promise<void> {
  const blob = await getBrowserApi().prescriptions.pdf(id);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
