import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const vercel = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));

test("the Vercel production package explicitly starts with demo mode disabled", () => {
  assert.equal(vercel.env?.NEXT_PUBLIC_DEMO_MODE, "false");
  assert.equal(vercel.env?.NEXT_PUBLIC_DENTY_REALTIME, "false");
});
