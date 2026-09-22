"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DentalEntity } from "@/domain";
import type {
  CreateOdontogramSnapshot,
  OdontogramRecord,
  PeriodontalMeasurementInput,
} from "@/shared/api/schemas/clinical";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";

import {
  domainEntityToApiInput,
  persistedEntityToDomain,
} from "@/shared/odontogram/odontogram-wire";

export function useOdontogramQuery(patientId: string, enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.clinical.odontogram(patientId),
    queryFn: () => getBrowserApi().clinical.odontogram.get(patientId),
    enabled: enabled && Boolean(patientId),
  });
}

export function useOdontogramSnapshotsQuery(patientId: string, enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.clinical.snapshots(patientId),
    queryFn: () => getBrowserApi().clinical.odontogram.snapshots.list(patientId),
    enabled: enabled && Boolean(patientId),
  });
}

export function useSaveOdontogramBatchMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      expectedVersion: number;
      entities: readonly DentalEntity[];
    }) =>
      getBrowserApi().clinical.odontogram.batch(patientId, {
        expectedVersion: input.expectedVersion,
        entities: input.entities.map(domainEntityToApiInput),
      }),
    onSuccess: () => {
      invalidateOdontogramQueries(queryClient, patientId);
    },
  });
}

export function useRecordPeriodontalMeasurementMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (measurement: PeriodontalMeasurementInput) =>
      getBrowserApi().clinical.odontogram.periodontal(patientId, measurement),
    onSuccess: () => {
      invalidateOdontogramQueries(queryClient, patientId);
    },
  });
}

export function useCreateOdontogramSnapshotMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOdontogramSnapshot) =>
      getBrowserApi().clinical.odontogram.snapshots.create(patientId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dentyQueryKeys.clinical.odontogram(patientId),
      });
      void queryClient.invalidateQueries({
        queryKey: dentyQueryKeys.clinical.snapshots(patientId),
      });
    },
  });
}

function invalidateOdontogramQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  patientId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: dentyQueryKeys.clinical.odontogram(patientId),
  });
  void queryClient.invalidateQueries({
    queryKey: dentyQueryKeys.clinical.snapshots(patientId),
  });
  void queryClient.invalidateQueries({
    queryKey: dentyQueryKeys.clinical.sync(patientId),
  });
}

export function odontogramEntities(record: OdontogramRecord): readonly DentalEntity[] {
  return record.entities.map(persistedEntityToDomain);
}
