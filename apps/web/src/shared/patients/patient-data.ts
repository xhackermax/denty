"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreatePatient, UpdatePatient } from "@/shared/api";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";

export function usePatientsQuery(enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.patients.all,
    queryFn: () => getBrowserApi().patients.list(),
    enabled,
  });
}

export function usePatientQuery(patientId: string, enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.patients.detail(patientId),
    queryFn: () => getBrowserApi().patients.get(patientId),
    enabled: enabled && Boolean(patientId),
  });
}

export function usePatientProjectionQuery(patientId: string, enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.patients.projection(patientId),
    queryFn: () => getBrowserApi().portal.projection(patientId),
    enabled: enabled && Boolean(patientId),
  });
}

export function useCreatePatientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePatient) => getBrowserApi().patients.create(payload),
    onSuccess: (patient) => {
      queryClient.setQueryData(
        dentyQueryKeys.patients.detail(patient.id),
        patient,
      );
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.patients.all });
    },
  });
}

export function useUpdatePatientMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePatient) =>
      getBrowserApi().patients.update(patientId, payload),
    onSuccess: (patient) => {
      queryClient.setQueryData(
        dentyQueryKeys.patients.detail(patient.id),
        patient,
      );
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.patients.all });
    },
  });
}
