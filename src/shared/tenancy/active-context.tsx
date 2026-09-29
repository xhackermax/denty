"use client";

import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
const ACTIVE_SITE_STORAGE_KEY = "denty.activeSiteId";

function readStoredSiteId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_SITE_STORAGE_KEY);
  } catch {
    return null;
  }
}

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
  const [activeSiteId, setActiveSiteIdState] = useState<string | null>(null);
  // The chosen site is remembered per browser (reception desks stay on their site).
  const setActiveSiteId = useCallback((siteId: string | null) => {
    setActiveSiteIdState(siteId);
    try {
      if (siteId) window.localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, siteId);
    } catch {
      // Storage unavailable (private mode): the choice lasts for this visit only.
    }
  }, []);

  useEffect(() => {
    if (activeSiteId && sites.some((site) => site.id === activeSiteId)) return;
    const stored = readStoredSiteId();
    const next = sites.find((site) => site.id === stored)?.id ?? sites[0]?.id ?? null;
    if (next !== activeSiteId) setActiveSiteIdState(next);
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
      setActiveSiteId,
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
