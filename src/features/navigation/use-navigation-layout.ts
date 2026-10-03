"use client";

import { useQuery } from "@tanstack/react-query";

import { resolvePinned, type NavigationKey } from "@/domain/navigation";
import { getBrowserApi } from "@/shared/api/browser";
import type { NavigationLayouts } from "@/shared/api/schemas/navigation";
import { dentyQueryKeys } from "@/shared/query/keys";

export interface NavigationLayoutApi {
  layouts(): Promise<NavigationLayouts>;
  saveMine(pinned: readonly NavigationKey[] | null): Promise<NavigationLayouts>;
  saveClinic(pinned: readonly NavigationKey[] | null): Promise<NavigationLayouts>;
}

// Looked up on use: the browser client does not exist while Next prerenders on the server.
export const browserNavigationApi: NavigationLayoutApi = {
  layouts: () => getBrowserApi().navigation.layouts(),
  saveMine: (pinned) => getBrowserApi().navigation.saveMine(pinned),
  saveClinic: (pinned) => getBrowserApi().navigation.saveClinic(pinned),
};

export function useNavigationLayouts(api: NavigationLayoutApi = browserNavigationApi) {
  return useQuery({
    queryKey: dentyQueryKeys.navigation.layout,
    queryFn: () => api.layouts(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** The order the menu shows: personal, else the clinic's, else the built-in one (also offline). */
export function useResolvedNavigation(api?: NavigationLayoutApi) {
  const { data } = useNavigationLayouts(api);
  return resolvePinned({ user: data?.user ?? null, clinic: data?.clinic ?? null });
}
