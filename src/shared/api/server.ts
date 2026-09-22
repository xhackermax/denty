import { getServerEnv } from "@/shared/config/env";

import { ApiClient } from "./client";
import { createDentyApi } from "./endpoints";

export function getServerApi() {
  const { DENTY_API_URL } = getServerEnv();
  if (!DENTY_API_URL) {
    throw new Error("DENTY_API_URL es obligatorio para usar Denty API fuera del modo demo.");
  }
  return createDentyApi(new ApiClient({ baseUrl: DENTY_API_URL }));
}
