"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { dentyQueryKeys } from "@/shared/query";
import type { ReplanPlan } from "./task-timeline";
import type { TaskCreateInput, TaskUpdateInput, TasksApi, TimelineTask } from "./task-types";

interface TasksData {
  items: TimelineTask[];
}

interface PatchInput {
  id: string;
  version: number;
  patch: TaskUpdateInput;
}

// Las mutaciones esperan al refetch para que el deshacer lea la versión ya actualizada.
export function useTaskActions(api: TasksApi) {
  const qc = useQueryClient();
  const key = dentyQueryKeys.tasks.all;
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: (input: TaskCreateInput) => api.create(input),
    onSuccess: refresh,
  });

  const patch = useMutation({
    mutationFn: ({ id, version, patch: body }: PatchInput) =>
      api.update(id, { ...body, expectedVersion: version }),
    onSuccess: refresh,
  });

  const patchMany = useMutation({
    mutationFn: (inputs: PatchInput[]) =>
      Promise.all(
        inputs.map(({ id, version, patch: body }) =>
          api.update(id, { ...body, expectedVersion: version }),
        ),
      ),
    onSuccess: refresh,
    onError: refresh,
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => api.reorder(orderedIds),
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<TasksData>(key);
      if (previous) {
        const byId = new Map(previous.items.map((t) => [t.id, t]));
        const items = orderedIds.flatMap((id, position) => {
          const found = byId.get(id);
          return found ? [{ ...found, position }] : [];
        });
        qc.setQueryData<TasksData>(key, { items });
      }
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },
    onSettled: refresh,
  });

  const replan = useMutation({
    mutationFn: async (input: { plan: ReplanPlan; allIds: string[]; tasks: TimelineTask[] }) => {
      const byId = new Map(input.tasks.map((t) => [t.id, t]));
      await Promise.all(
        input.plan.clearDueAtIds.flatMap((id) => {
          const task = byId.get(id);
          return task ? [api.update(id, { dueAt: null, expectedVersion: task.version })] : [];
        }),
      );
      await api.reorder(input.allIds);
    },
    onSuccess: refresh,
    onError: refresh,
  });

  return { create, patch, patchMany, reorder, replan };
}
