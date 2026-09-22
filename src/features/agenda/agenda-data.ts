"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateAppointment, UpdateAppointment } from "@/shared/api";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";

export function useAppointmentsQuery(date: string, enabled = true) {
  return useQuery({
    queryKey: dentyQueryKeys.appointments.day(date),
    queryFn: () => getBrowserApi().appointments.list(date),
    enabled: enabled && Boolean(date),
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
    mutationFn: (payload: CreateAppointment) =>
      getBrowserApi().appointments.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: dentyQueryKeys.appointments.day(date),
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
        queryKey: dentyQueryKeys.appointments.day(date),
      });
    },
  });
}

export function useAppointmentTransitionMutation(date: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: dentyQueryKeys.appointments.day(date),
    });

  return {
    arrive: useMutation({
      mutationFn: (input: { id: string; expectedVersion: number }) =>
        getBrowserApi().appointments.arrive(input.id, input.expectedVersion),
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
    complete: useMutation({
      mutationFn: (input: { id: string; expectedVersion: number }) =>
        getBrowserApi().appointments.complete(input.id, input.expectedVersion),
      onSuccess: () => void invalidate(),
    }),
  };
}
