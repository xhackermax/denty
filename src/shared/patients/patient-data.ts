"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreatePatient, UpdatePatient } from "@/shared/api";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";

export function usePatientsQuery(
  enabled = true,
  includeArchived = false,
  search?: string,
  page = 1,
) {
  return useQuery({
    queryKey: [...dentyQueryKeys.patients.list(includeArchived), search ?? "", page],
    queryFn: () =>
      getBrowserApi().patients.list({
        includeArchived,
        ...(search ? { search } : {}),
        page,
        pageSize: 50,
      }),
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
      queryClient.setQueryData(dentyQueryKeys.patients.detail(patient.id), patient);
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.patients.root });
    },
  });
}

export function useUpdatePatientMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePatient) => getBrowserApi().patients.update(patientId, payload),
    onSuccess: (patient) => {
      queryClient.setQueryData(dentyQueryKeys.patients.detail(patient.id), patient);
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.patients.root });
    },
  });
}

export function useUploadPatientPhotoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, file }: { patientId: string; file: File }) =>
      getBrowserApi().patients.uploadPhoto(patientId, file),
    onSuccess: (patient) => {
      queryClient.setQueryData(dentyQueryKeys.patients.detail(patient.id), patient);
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.patients.root });
    },
  });
}

export function useArchivePatientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      patientId,
      expectedVersion,
      reason,
    }: {
      patientId: string;
      expectedVersion: number;
      reason?: string;
    }) =>
      getBrowserApi().patients.archive(patientId, {
        expectedVersion,
        ...(reason ? { reason } : {}),
      }),
    onSuccess: (patient) => {
      queryClient.setQueryData(dentyQueryKeys.patients.detail(patient.id), patient);
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.patients.root });
    },
  });
}

export function useRestorePatientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, expectedVersion }: { patientId: string; expectedVersion: number }) =>
      getBrowserApi().patients.restore(patientId, { expectedVersion }),
    onSuccess: (patient) => {
      queryClient.setQueryData(dentyQueryKeys.patients.detail(patient.id), patient);
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.patients.root });
    },
  });
}
