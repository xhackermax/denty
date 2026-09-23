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
import { dentyQueryKeys } from "@/shared/query";

function invalidateClinicalPatient(
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
