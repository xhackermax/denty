"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ArgumentOverride } from "@/domain/plan";
import { getBrowserApi } from "@/shared/api/browser";
import type { SaveTreatmentComparisonInput } from "@/shared/api/schemas/clinical-arguments";
import { dentyQueryKeys } from "@/shared/query";

const NO_OVERRIDES: readonly ArgumentOverride[] = [];

export function useArgumentOverridesQuery() {
  return useQuery({
    queryKey: dentyQueryKeys.clinicalArguments.overrides,
    queryFn: () => getBrowserApi().clinicalArguments.overrides(),
    staleTime: 5 * 60_000,
  });
}

/** The clinic's changes to the phrase library; empty (the plain template) until they load. */
export function useArgumentOverrides(): readonly ArgumentOverride[] {
  return useArgumentOverridesQuery().data?.items ?? NO_OVERRIDES;
}

export function useArgumentHistoryQuery(entryId: string | null) {
  return useQuery({
    queryKey: dentyQueryKeys.clinicalArguments.history(entryId ?? ""),
    queryFn: () => getBrowserApi().clinicalArguments.history(entryId ?? ""),
    enabled: Boolean(entryId),
  });
}

function useLibraryMutation<TInput>(run: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: dentyQueryKeys.clinicalArguments.root }),
  });
}

export function useSaveArgumentOverrides() {
  return useLibraryMutation((items: ArgumentOverride[]) =>
    getBrowserApi().clinicalArguments.save({ items }),
  );
}

export function useRestoreArgumentOverrides() {
  return useLibraryMutation((phraseIds: string[]) =>
    getBrowserApi().clinicalArguments.restore({ phraseIds }),
  );
}

export function usePatientComparisonsQuery(patientId: string) {
  return useQuery({
    queryKey: dentyQueryKeys.clinicalArguments.comparisons(patientId),
    queryFn: () => getBrowserApi().clinicalArguments.comparisons(patientId),
  });
}

export function useSaveComparisonMutation(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveTreatmentComparisonInput) =>
      getBrowserApi().clinicalArguments.saveComparison(patientId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: dentyQueryKeys.clinicalArguments.comparisons(patientId),
      }),
  });
}
