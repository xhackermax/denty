import { QueryClient } from "@tanstack/react-query";

import { DentyApiError } from "@/shared/api";

function shouldRetry(failureCount: number, error: unknown): boolean {
  return (
    failureCount < 1 &&
    error instanceof DentyApiError &&
    (error.kind === "network" || error.kind === "unavailable")
  );
}

export function createDentyQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Route-specific clinical payloads can be large; a reload should not be the
        // only way to release data collected while navigating the workspace.
        gcTime: 60_000,
        // Realtime keeps active views current, so focus should not fan out stale
        // refetches from every route recently visited in the same tab.
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
