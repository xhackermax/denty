import { ApiClient } from "./client";
import { createDentyApi } from "./endpoints";
import { DENTY_EVENTS_PATH, openDentyEventStream, type DentyEventStreamOptions } from "./events";

export const DENTY_BROWSER_API_BASE_URL = "/api/denty";

let browserApi: ReturnType<typeof createDentyApi> | undefined;

export function getBrowserApi() {
  if (typeof window === "undefined") {
    throw new Error("getBrowserApi solo puede usarse en componentes cliente.");
  }
  browserApi ??= createDentyApi(new ApiClient({ baseUrl: DENTY_BROWSER_API_BASE_URL }));
  return browserApi;
}

export function openBrowserDentyEventStream(options: Omit<DentyEventStreamOptions, "url">) {
  return openDentyEventStream({
    ...options,
    url: `${DENTY_BROWSER_API_BASE_URL}${DENTY_EVENTS_PATH}`,
  });
}
