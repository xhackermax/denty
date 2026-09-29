import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getServerEnv } from "@/shared/config/env";
import { resolveSupabasePublicCredentials } from "./credentials";

export async function createSupabaseServerClient() {
  const credentials = resolveSupabasePublicCredentials(getServerEnv());
  if (!credentials) throw new Error("Supabase público no está configurado.");
  const store = await cookies();
  return createServerClient(credentials.url, credentials.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        for (const { name, value, options } of values) {
          try {
            store.set(name, value, options);
          } catch {
            /* Server Components may be read-only. */
          }
        }
      },
    },
  });
}
