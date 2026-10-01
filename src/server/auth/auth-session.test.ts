import { expect, test } from "vitest";
import { readAuthCookies } from "./auth-session";

test("malformed cookie encoding is treated as missing credentials", () => {
  expect(
    readAuthCookies(
      new Request("https://denty.test", {
        headers: { cookie: "denty_sb_access=%E0%A4%A; denty_app_session=valid" },
      }),
    ),
  ).toEqual({ accessToken: null, refreshToken: null, appSessionId: "valid" });
});
