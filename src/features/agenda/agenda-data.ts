"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Appointment, CreateAppointment, UpdateAppointment } from "@/shared/api";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";

export function useAppointmentsQuery(date: string, enabled = true, siteId?: string | null) {
  return useQuery({
    queryKey: dentyQueryKeys.appointments.day(date, siteId),
    queryFn: () => getBrowserApi().appointments.list(date, siteId ?? undefined),
    enabled: enabled && Boolean(date),
  });
}

/** One cached query per visible day, so navigating back and forth reuses data. */
export function useAppointmentsRangeQuery(dates: readonly string[], siteId?: string | null) {
  return useQueries({
    queries: dates.map((date) => ({
      queryKey: dentyQueryKeys.appointments.day(date, siteId),
      queryFn: () => getBrowserApi().appointments.list(date, siteId ?? undefined),
    })),
    combine: (results) => ({
      data: results.flatMap((result) => result.data ?? []),
      isError: results.some((result) => result.isError),
      isLoading: results.some((result) => result.isLoading),
    }),
  });
}

export function useAgendaBlocksRangeQuery(dates: readonly string[], siteId?: string | null) {
  return useQueries({
    queries: dates.map((date) => ({
      queryKey: dentyQueryKeys.appointments.blocks(date, siteId),
      queryFn: () => getBrowserApi().agenda.blocks.list(date, siteId ?? undefined),
    })),
    combine: (results) => results.flatMap((result) => result.data?.items ?? []),
  });
}

/** Warm the cache for the ranges either side of the visible one. */
export function usePrefetchAppointmentDays() {
  const queryClient = useQueryClient();
  return (dates: readonly string[], siteId?: string | null) => {
    for (const date of dates) {
      void queryClient.prefetchQuery({
        queryKey: dentyQueryKeys.appointments.day(date, siteId),
        queryFn: () => getBrowserApi().appointments.list(date, siteId ?? undefined),
      });
    }
  };
}

export function useCreateAgendaBlockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      payload: Parameters<ReturnType<typeof getBrowserApi>["agenda"]["blocks"]["create"]>[0],
    ) => getBrowserApi().agenda.blocks.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.appointments.root });
    },
  });
}

/**
 * Move/resize with optimistic UI: the card jumps immediately in every cached day and
 * rolls back if the server rejects the change (conflict, stale version…).
 */
export function useMoveAppointmentMutation() {
  const queryClient = useQueryClient();
  const dayQueries = { queryKey: dentyQueryKeys.appointments.dayRoot };
  return useMutation({
    mutationFn: (input: { id: string; payload: UpdateAppointment; targetDate: string }) =>
      getBrowserApi().appointments.update(input.id, input.payload),
    onMutate: async (input) => {
      await queryClient.cancelQueries(dayQueries);
      const previous = queryClient.getQueriesData<Appointment[]>(dayQueries);
      const moving = previous
        .flatMap(([, data]) => data ?? [])
        .find((appointment) => appointment.id === input.id);
      if (moving) {
        const moved: Appointment = {
          ...moving,
          ...(input.payload.staffId ? { staffId: input.payload.staffId } : {}),
          ...(input.payload.cabinetId !== undefined ? { cabinetId: input.payload.cabinetId } : {}),
          ...(input.payload.startsAt ? { startsAt: input.payload.startsAt } : {}),
          ...(input.payload.endsAt ? { endsAt: input.payload.endsAt } : {}),
        };
        for (const [key, data] of previous) {
          if (!data) continue;
          const keyDate = (key[3] as { date?: string } | undefined)?.date;
          const without = data.filter((appointment) => appointment.id !== input.id);
          queryClient.setQueryData(
            key,
            keyDate === input.targetDate ? [...without, moved] : without,
          );
        }
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.appointments.root });
    },
  });
}

export function useAgendaContextQuery(enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.appointments.context,
    queryFn: () => getBrowserApi().agenda.context(),
    enabled,
  });
}

export function useCreateAppointmentMutation(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAppointment) => getBrowserApi().appointments.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dentyQueryKeys.appointments.root,
      });
    },
  });
}

export function useUpdateAppointmentMutation(date: string, appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateAppointment) =>
      getBrowserApi().appointments.update(appointmentId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dentyQueryKeys.appointments.root,
      });
    },
  });
}

export function useUpdateAppointmentForDayMutation(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; payload: UpdateAppointment }) =>
      getBrowserApi().appointments.update(input.id, input.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dentyQueryKeys.appointments.root,
      });
    },
  });
}

export function useAppointmentTransitionMutation(date: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: dentyQueryKeys.appointments.root,
    });

  return {
    arrive: useMutation({
      mutationFn: (input: { id: string; expectedVersion: number }) =>
        getBrowserApi().appointments.arrive(input.id, input.expectedVersion),
      onSuccess: () => void invalidate(),
    }),
    waiting: useMutation({
      mutationFn: (input: { id: string; expectedVersion: number }) =>
        getBrowserApi().appointments.waiting(input.id, input.expectedVersion),
      onSuccess: () => void invalidate(),
    }),
    chair: useMutation({
      mutationFn: (input: { id: string; expectedVersion: number }) =>
        getBrowserApi().appointments.chair(input.id, input.expectedVersion),
      onSuccess: () => void invalidate(),
    }),
    noShow: useMutation({
      mutationFn: (input: { id: string; expectedVersion: number }) =>
        getBrowserApi().appointments.noShow(input.id, input.expectedVersion),
      onSuccess: () => void invalidate(),
    }),
    cancel: useMutation({
      mutationFn: (input: { id: string; expectedVersion: number; reason: string }) =>
        getBrowserApi().appointments.cancel(input.id, input.expectedVersion, input.reason),
      onSuccess: () => void invalidate(),
    }),
    complete: useMutation({
      mutationFn: (input: { id: string; expectedVersion: number }) =>
        getBrowserApi().appointments.complete(input.id, input.expectedVersion),
      onSuccess: () => void invalidate(),
    }),
  };
}
