"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { Patient } from "@/shared/api";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import { useActiveTenant } from "@/shared/tenancy/active-context";

import { longDate, shortDate, type TemplateValues } from "./template-render";

export interface DocumentDoctor {
  id: string;
  displayName: string;
  collegiateNumber: string | null;
}

/**
 * Letterhead and signers for clinical documents: clinic name, the current site,
 * the professionals with their collegiate number and the signed-in doctor.
 */
export function useDocumentContext() {
  const { activeSiteId } = useActiveTenant();
  const settings = useQuery({
    queryKey: dentyQueryKeys.prescriptions.settings,
    queryFn: () => getBrowserApi().prescriptions.settings.get(),
    staleTime: 60_000,
  });
  const session = useQuery({
    queryKey: dentyQueryKeys.session,
    queryFn: () => getBrowserApi().auth.session(),
    staleTime: 60_000,
  });
  return useMemo(() => {
    const staff = settings.data?.staff ?? [];
    const doctors: DocumentDoctor[] = staff
      .filter((member) => member.role === "DENTIST" || member.id === session.data?.actor.staffId)
      .map((member) => ({
        id: member.id,
        displayName: member.displayName,
        collegiateNumber: member.collegiateNumber ?? null,
      }));
    const actorStaffId = session.data?.actor.staffId;
    const sites = settings.data?.sites ?? [];
    const site =
      sites.find((entry) => entry.id === activeSiteId) ??
      sites.find((entry) => entry.active !== false) ??
      sites[0];
    return {
      loading: settings.isLoading,
      clinicName: settings.data?.clinic.name ?? "Clínica dental",
      site,
      doctors,
      defaultDoctorId:
        doctors.find((doctor) => doctor.id === actorStaffId)?.id ?? doctors[0]?.id ?? null,
      doctorById: (id: string | null | undefined) =>
        doctors.find((doctor) => doctor.id === id) ?? null,
    };
  }, [activeSiteId, session.data?.actor.staffId, settings.data, settings.isLoading]);
}

/** Values for the {{placeholders}} of consents and certificates. */
export function documentValues(input: {
  patient: (Pick<Patient, "firstName" | "lastName"> & { dni?: string | null | undefined }) | null;
  doctor: DocumentDoctor | null;
  clinicName: string;
  city?: string | null | undefined;
  date: string;
  treatment?: string | null | undefined;
  extra?: TemplateValues;
}): TemplateValues {
  return {
    paciente: input.patient ? `${input.patient.firstName} ${input.patient.lastName}`.trim() : "",
    dni: input.patient?.dni ?? "________",
    doctor: input.doctor?.displayName ?? "",
    colegiado: input.doctor?.collegiateNumber ?? "________",
    clinica: input.clinicName,
    ciudad: input.city ?? "",
    fecha: shortDate(input.date),
    fecha_larga: longDate(input.date),
    tratamiento_texto: input.treatment ? ` (${input.treatment})` : "",
    ...input.extra,
  };
}
