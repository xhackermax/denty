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
        gcTime: 5 * 60_000,
        retry: shouldRetry,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
