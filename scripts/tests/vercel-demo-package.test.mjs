import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const vercel = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));

test("the Vercel trial package explicitly enables the self-contained demo", () => {
  assert.equal(vercel.env?.NEXT_PUBLIC_DEMO_MODE, "true");
  assert.equal(vercel.env?.NEXT_PUBLIC_DENTY_REALTIME, "false");
});
