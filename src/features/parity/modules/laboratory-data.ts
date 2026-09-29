"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";

import type { CreateLabWork, LabTransition } from "@/shared/api";
import type {
  createLaboratorySchema,
  recordSupplierInvoiceSchema,
  recordSupplierPaymentSchema,
  updateLaboratorySchema,
} from "@/shared/api/schemas/core";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";

function invalidateLaboratory(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.laboratory.root });
  void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.analytics.root });
  void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.dashboard.root });
}

export function useLaboratoryQuery(enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.laboratory.all,
    queryFn: () => getBrowserApi().laboratory.list(),
    enabled,
  });
}

export function useLaboratoriesQuery(enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.laboratory.laboratories,
    queryFn: () => getBrowserApi().laboratory.listLaboratories(),
    enabled,
  });
}

export function usePatientClinicalPlanQuery(patientId: string | null) {
  return useQuery({
    queryKey: dentyQueryKeys.clinical.plan(patientId ?? "__none__"),
    queryFn: () => getBrowserApi().clinical.plan.get(patientId!),
    enabled: Boolean(patientId),
  });
}

export function useLaboratoryBalancesQuery(enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.laboratory.balances,
    queryFn: () => getBrowserApi().laboratory.balances(),
    enabled,
  });
}

export function useSupplierInvoicesQuery(enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.laboratory.supplierInvoices,
    queryFn: () => getBrowserApi().laboratory.supplierInvoices.list(),
    enabled,
  });
}

export function useSupplierPaymentsQuery(enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.laboratory.supplierPayments,
    queryFn: () => getBrowserApi().laboratory.supplierPayments.list(),
    enabled,
  });
}

export function useCreateLaboratoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: z.input<typeof createLaboratorySchema>) =>
      getBrowserApi().laboratory.createLaboratory(payload),
    onSuccess: () => invalidateLaboratory(queryClient),
  });
}

export function useUpdateLaboratoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; payload: z.input<typeof updateLaboratorySchema> }) =>
      getBrowserApi().laboratory.updateLaboratory(input.id, input.payload),
    onSuccess: () => invalidateLaboratory(queryClient),
  });
}

export function useCreateLabWorkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLabWork) => getBrowserApi().laboratory.create(payload),
    onSuccess: () => invalidateLaboratory(queryClient),
  });
}

export function useLabTransitionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; payload: LabTransition }) =>
      getBrowserApi().laboratory.transition(input.id, input.payload),
    onSuccess: () => invalidateLaboratory(queryClient),
  });
}

export function useLabReworkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reason: string; costCents?: number; etaAt?: string }) =>
      getBrowserApi().laboratory.rework(input.id, {
        reason: input.reason,
        ...(input.costCents !== undefined ? { costCents: input.costCents } : {}),
        ...(input.etaAt ? { etaAt: input.etaAt } : {}),
      }),
    onSuccess: () => invalidateLaboratory(queryClient),
  });
}

export function useLabAttachmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; file: File }) =>
      getBrowserApi().laboratory.addAttachment(input.id, input.file),
    onSuccess: () => invalidateLaboratory(queryClient),
  });
}

export function useRecordSupplierInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: z.input<typeof recordSupplierInvoiceSchema>) =>
      getBrowserApi().laboratory.supplierInvoices.create(payload),
    onSuccess: () => invalidateLaboratory(queryClient),
  });
}

export function useRecordSupplierPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: z.input<typeof recordSupplierPaymentSchema>) =>
      getBrowserApi().laboratory.supplierPayments.create(payload),
    onSuccess: () => invalidateLaboratory(queryClient),
  });
}

export function useAllocateSupplierPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { paymentId: string; invoiceId: string; amountCents: number }) =>
      getBrowserApi().laboratory.supplierPayments.allocate(input.paymentId, {
        invoiceId: input.invoiceId,
        amountCents: input.amountCents,
      }),
    onSuccess: () => invalidateLaboratory(queryClient),
  });
}
