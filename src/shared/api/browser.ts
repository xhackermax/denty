import { ApiClient } from "./client";
import { createDentyApi } from "./endpoints";

export const DENTY_BROWSER_API_BASE_URL = "";

let browserApi: ReturnType<typeof createDentyApi> | undefined;

export function getBrowserApi() {
  if (typeof window === "undefined") {
    throw new Error("getBrowserApi solo puede usarse en componentes cliente.");
  }
  browserApi ??= createDentyApi(new ApiClient({ baseUrl: DENTY_BROWSER_API_BASE_URL }));
  return browserApi;
}
