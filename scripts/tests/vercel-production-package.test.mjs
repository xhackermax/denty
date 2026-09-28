import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const vercel = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));

test("the Vercel production package has no alternate-access environment toggles", () => {
  assert.deepEqual(vercel.env ?? {}, {});
});
