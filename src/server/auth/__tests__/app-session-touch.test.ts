import { describe, expect, it, vi } from "vitest";

import type { SupabaseRestClient } from "../../supabase/rest-client";
import { AuthRepository } from "../auth-repository";

describe("touchAppSession", () => {
  it("only extends a session that has not expired or been revoked", async () => {
    const patchMany = vi.fn(async () => []);
    const repository = new AuthRepository({ patchMany } as unknown as SupabaseRestClient);
    const before = Date.now();

    await repository.touchAppSession("user-1", "session-1");

    const [table, filter, body] = patchMany.mock.calls[0] as unknown as [
      string,
      Record<string, string>,
      Record<string, string>,
    ];
    expect(table).toBe("app_sessions");
    expect(filter).toMatchObject({
      id: "eq.session-1",
      profile_id: "eq.user-1",
      revoked_at: "is.null",
    });
    // A request that started before the session expired must not bring it back to life.
    expect(filter.expires_at).toMatch(/^gt\./);
    expect(new Date(filter.expires_at!.slice(3)).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(body.expires_at!).getTime()).toBeGreaterThan(before);
  });
});
