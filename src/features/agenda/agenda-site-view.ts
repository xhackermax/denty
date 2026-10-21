import { useCallback, useState } from "react";

export interface AgendaSiteView {
  /** Site whose agenda is shown, or null when every site is shown at once. */
  viewSiteId: string | null;
  allSites: boolean;
  showAllSites: () => void;
  showSite: (siteId: string) => void;
}

/**
 * "Todas las sedes" is a view choice of the agenda, not a tenant change: the active
 * tenant always falls back to a concrete site because other screens need one, so
 * clearing it there was undone immediately and the button seemed to do nothing.
 */
export function useAgendaSiteView(
  activeSiteId: string | null,
  setActiveSiteId: (siteId: string | null) => void,
): AgendaSiteView {
  const [allSites, setAllSites] = useState(false);
  const showAllSites = useCallback(() => setAllSites(true), []);
  const showSite = useCallback(
    (siteId: string) => {
      setAllSites(false);
      setActiveSiteId(siteId);
    },
    [setActiveSiteId],
  );
  return { viewSiteId: allSites ? null : activeSiteId, allSites, showAllSites, showSite };
}
