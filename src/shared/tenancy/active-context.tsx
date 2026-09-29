"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query/keys";

type SiteOption = { id: string; name: string };

interface ActiveTenantContextValue {
  activeClinicId: string | null;
  activeSiteId: string | null;
  role: string | null;
  permissions: readonly string[];
  sites: readonly SiteOption[];
  setActiveSiteId: (siteId: string | null) => void;
  loading: boolean;
}

const ActiveTenantContext = createContext<ActiveTenantContextValue | null>(null);

export function ActiveTenantProvider({ children }: { children: ReactNode }) {
  const sessionQuery = useQuery({
    queryKey: dentyQueryKeys.session,
    queryFn: () => getBrowserApi().auth.session(),
    staleTime: 60_000,
  });
  const agendaContextQuery = useQuery({
    queryKey: dentyQueryKeys.appointments.context,
    queryFn: () => getBrowserApi().agenda.context(),
    enabled: sessionQuery.isSuccess,
    staleTime: 60_000,
  });
  const sites = useMemo(
    () => (agendaContextQuery.data?.sites ?? []).map((site) => ({ id: site.id, name: site.name })),
    [agendaContextQuery.data?.sites],
  );
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);

  useEffect(() => {
    if (activeSiteId && sites.some((site) => site.id === activeSiteId)) return;
    setActiveSiteId(sites[0]?.id ?? null);
  }, [activeSiteId, sites]);

  const value = useMemo<ActiveTenantContextValue>(
    () => ({
      activeClinicId: sessionQuery.data?.actor.clinicId ?? null,
      activeSiteId,
      role: sessionQuery.data?.actor.role ?? null,
      permissions: sessionQuery.data?.actor.permissions ?? [],
      sites,
      setActiveSiteId,
      loading: sessionQuery.isPending || agendaContextQuery.isPending,
    }),
    [
      activeSiteId,
      agendaContextQuery.isPending,
      sessionQuery.data?.actor.clinicId,
      sessionQuery.data?.actor.permissions,
      sessionQuery.data?.actor.role,
      sessionQuery.isPending,
      sites,
    ],
  );

  return <ActiveTenantContext.Provider value={value}>{children}</ActiveTenantContext.Provider>;
}

export function useActiveTenant(): ActiveTenantContextValue {
  const value = useContext(ActiveTenantContext);
  if (!value) throw new Error("useActiveTenant debe usarse dentro de ActiveTenantProvider.");
  return value;
}
