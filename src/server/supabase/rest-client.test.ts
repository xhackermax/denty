import { describe, expect, it } from "vitest";

import { buildSupabaseRestHeaders } from "./rest-client";

describe("Supabase REST client headers", () => {
  it("sends Authorization for modern Supabase API keys as well as legacy JWT keys", () => {
    const headers = buildSupabaseRestHeaders("sb_secret_live_example");

    expect(headers.apikey).toBe("sb_secret_live_example");
    expect(headers.authorization).toBe("Bearer sb_secret_live_example");
  });
});
