"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  ClinicalEncounterInput,
  ClinicalProblemInput,
  EndodonticAssessmentInput,
  EndodonticPlanInput,
  PeriodontalExamInput,
} from "@/shared/api";
import { getBrowserApi } from "@/shared/api/browser";
import { createPlanItemSchema } from "@/shared/api/schemas/clinical";
import { z } from "zod";
import { dentyQueryKeys } from "@/shared/query";

export function invalidateClinicalPatient(
  queryClient: ReturnType<typeof useQueryClient>,
  patientId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: dentyQueryKeys.clinical.workflow(patientId),
  });
  void queryClient.invalidateQueries({
    queryKey: dentyQueryKeys.clinical.plan(patientId),
  });
  void queryClient.invalidateQueries({
    queryKey: dentyQueryKeys.clinical.sync(patientId),
  });
  void queryClient.invalidateQueries({
    queryKey: dentyQueryKeys.clinical.consents(patientId),
  });
}

export function useClinicalPlanQuery(patientId: string, enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.clinical.plan(patientId),
    queryFn: () => getBrowserApi().clinical.plan.get(patientId),
    enabled: enabled && Boolean(patientId),
  });
}

export function useClinicalWorkflowQuery(patientId: string, enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.clinical.workflow(patientId),
    queryFn: () => getBrowserApi().clinical.workflow.get(patientId),
    enabled: enabled && Boolean(patientId),
  });
}

export function useConsentRequirementsQuery(patientId: string, enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.clinical.consents(patientId),
    queryFn: () => getBrowserApi().clinical.consents.requirements(patientId),
    enabled: enabled && Boolean(patientId),
  });
}

export function useTreatmentCatalogQuery(enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.treatmentCatalog.all,
    queryFn: () => getBrowserApi().admin.treatmentCatalog.list(),
    enabled,
  });
}

export function useClinicalSyncQuery(patientId: string, enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.clinical.sync(patientId),
    queryFn: () => getBrowserApi().clinical.sync.get(patientId),
    enabled: enabled && Boolean(patientId),
  });
}

export function useCreateClinicalProblemMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClinicalProblemInput) =>
      getBrowserApi().clinical.workflow.createProblem(patientId, payload),
    onSuccess: () => invalidateClinicalPatient(queryClient, patientId),
  });
}

export function useCreateClinicalEncounterMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClinicalEncounterInput) =>
      getBrowserApi().clinical.workflow.createEncounter(patientId, payload),
    onSuccess: () => invalidateClinicalPatient(queryClient, patientId),
  });
}

export function useCreateEndodonticAssessmentMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EndodonticAssessmentInput) =>
      getBrowserApi().clinical.workflow.createEndodonticAssessment(patientId, payload),
    onSuccess: () => invalidateClinicalPatient(queryClient, patientId),
  });
}

export function useCreateEndodonticPlanMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EndodonticPlanInput) =>
      getBrowserApi().clinical.workflow.createEndodonticPlan(patientId, payload),
    onSuccess: () => invalidateClinicalPatient(queryClient, patientId),
  });
}

export function useCreatePeriodontalExamMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PeriodontalExamInput) =>
      getBrowserApi().clinical.workflow.createPeriodontalExam(patientId, payload),
    onSuccess: () => invalidateClinicalPatient(queryClient, patientId),
  });
}

export function useAddClinicalPlanItemMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: z.input<typeof createPlanItemSchema>) =>
      getBrowserApi().clinical.plan.addItem(patientId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.clinical.plan(patientId) });
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.clinical.sync(patientId) });
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.clinical.consents(patientId) });
    },
  });
}

export function useSyncPlanFromOdontogramMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => getBrowserApi().clinical.sync.plan(patientId),
    onSuccess: () => invalidateClinicalPatient(queryClient, patientId),
  });
}

export function useSyncBudgetFromPlanMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => getBrowserApi().clinical.sync.budget(patientId),
    onSuccess: () => invalidateClinicalPatient(queryClient, patientId),
  });
}

/** Phase or custom budget from a selection of plan items (several budgets per plan). */
export function useCreateScopedBudgetMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      scope: "primary" | "secondary" | "custom";
      title?: string | undefined;
      clinicalPlanItemIds: string[];
    }) => getBrowserApi().clinical.sync.scopedBudget(patientId, input),
    onSuccess: () => invalidateClinicalPatient(queryClient, patientId),
  });
}

/** Stage 13: canonical budget signature (finalize_budget_signature RPC). */
export function useSignBudgetMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      budgetId: string;
      expectedVersion: number;
      signerName: string;
      signatureData: string;
    }) =>
      getBrowserApi().billing.budgets.sign(input.budgetId, {
        expectedVersion: input.expectedVersion,
        signerName: input.signerName,
        signatureData: input.signatureData,
      }),
    onSuccess: () => invalidateClinicalPatient(queryClient, patientId),
  });
}

export function useSetPlanItemPriceMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { itemId: string; priceCents: number }) =>
      getBrowserApi().clinical.plan.setItemPrice(input.itemId, input.priceCents),
    onSuccess: () => invalidateClinicalPatient(queryClient, patientId),
  });
}

export function useDocumentTemplatesQuery(enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.documents.templates,
    queryFn: () => getBrowserApi().documents.templates.list(),
    enabled,
  });
}

/** Creates the consent document from its template and signs it in one go. */
export function useSignConsentMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      templateId: string;
      title: string;
      signerName: string;
      signatureDataUrl: string;
      /** Doctor and treatment shown in the consent, kept to reprint it later. */
      data?: Record<string, string | null>;
    }) => {
      const api = getBrowserApi();
      const document = await api.documents.create({
        patientId,
        type: "CONSENT",
        title: input.title,
        templateId: input.templateId,
        data: input.data ?? {},
      });
      return api.documents.sign(document.id, {
        signerName: input.signerName,
        signatureDataUrl: input.signatureDataUrl,
      });
    },
    onSuccess: () => {
      invalidateClinicalPatient(queryClient, patientId);
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.documents.root });
    },
  });
}
