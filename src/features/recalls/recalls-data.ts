"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  RecallActionRequest,
  RecallBulkRequest,
  RecallCandidateFilters,
  RecallListFilters,
  RecallTemplateInput,
} from "@/shared/api";
import { getBrowserApi } from "@/shared/api/browser";

export const recallKeys = {
  root: ["recalls"] as const,
  list: (filters: RecallListFilters) => ["recalls", "list", filters] as const,
  templates: (includeArchived: boolean) => ["recalls", "templates", includeArchived] as const,
  history: (recallId: string) => ["recalls", "history", recallId] as const,
  context: ["recalls", "agenda-context"] as const,
};

function useInvalidateRecalls() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: recallKeys.root });
}

export function useRecallListQuery(filters: RecallListFilters, enabled = true) {
  return useQuery({
    queryKey: recallKeys.list(filters),
    queryFn: () => getBrowserApi().recalls.list(filters),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useRecallTemplatesQuery(includeArchived = false, enabled = true) {
  return useQuery({
    queryKey: recallKeys.templates(includeArchived),
    queryFn: () => getBrowserApi().recalls.templates(includeArchived),
    enabled,
  });
}

export function useRecallHistoryQuery(recallId: string | null) {
  return useQuery({
    queryKey: recallKeys.history(recallId ?? ""),
    queryFn: () => getBrowserApi().recalls.history(recallId ?? ""),
    enabled: recallId !== null,
  });
}

/** Sites and professionals for the selectors; the agenda context is readable by reception. */
export function useRecallStaffAndSitesQuery() {
  return useQuery({
    queryKey: recallKeys.context,
    queryFn: () => getBrowserApi().agenda.context(),
    staleTime: 5 * 60_000,
    select: (context) => ({
      sites: context.sites.filter((site) => site.active !== false),
      staff: context.staff.filter((member) => member.active !== false),
    }),
  });
}

export function useRecallActionMutation() {
  const invalidate = useInvalidateRecalls();
  return useMutation({
    mutationFn: ({ recallId, request }: { recallId: string; request: RecallActionRequest }) =>
      getBrowserApi().recalls.act(recallId, request),
    onSettled: invalidate,
  });
}

export function useRecallBulkMutation() {
  const invalidate = useInvalidateRecalls();
  return useMutation({
    mutationFn: (request: RecallBulkRequest) => getBrowserApi().recalls.bulk(request),
    onSettled: invalidate,
  });
}

export function useSaveRecallTemplateMutation() {
  const invalidate = useInvalidateRecalls();
  return useMutation({
    mutationFn: (
      input:
        | { templateId: null; template: RecallTemplateInput }
        | {
            templateId: string;
            template: RecallTemplateInput;
            expectedVersion: number;
            recomputePending: boolean;
          },
    ) =>
      input.templateId === null
        ? getBrowserApi().recalls.createTemplate(input.template)
        : getBrowserApi().recalls.updateTemplate(input.templateId, {
            template: input.template,
            expectedVersion: input.expectedVersion,
            recomputePending: input.recomputePending,
          }),
    onSettled: invalidate,
  });
}

export function useArchiveRecallTemplateMutation() {
  const invalidate = useInvalidateRecalls();
  return useMutation({
    mutationFn: ({ templateId, archive }: { templateId: string; archive: boolean }) =>
      getBrowserApi().recalls.archiveTemplate(templateId, { archive }),
    onSettled: invalidate,
  });
}

export function useAssignRecallMutation() {
  const invalidate = useInvalidateRecalls();
  return useMutation({
    mutationFn: ({
      templateId,
      patientIds,
      dueOverrides,
      anchorDate,
      idempotencyKey,
      dryRun = false,
    }: {
      templateId: string;
      patientIds: string[];
      dueOverrides?: Record<string, string>;
      anchorDate?: string | null;
      idempotencyKey?: string;
      dryRun?: boolean;
    }) =>
      getBrowserApi().recalls.assign(templateId, {
        patientIds,
        dueOverrides: dueOverrides ?? {},
        anchorDate: anchorDate ?? null,
        idempotencyKey: idempotencyKey ?? null,
        dryRun,
      }),
    onSettled: (_data, _error, variables) => (variables.dryRun ? undefined : invalidate()),
  });
}

export function fetchRecallCandidates(filters: RecallCandidateFilters) {
  return getBrowserApi().recalls.candidates(filters);
}
