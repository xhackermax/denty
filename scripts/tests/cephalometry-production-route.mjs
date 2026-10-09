import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 32179;
const origin = `http://127.0.0.1:${port}`;
const server = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, NODE_ENV: "production" },
});
let output = "";
server.stdout.on("data", (data) => { output += String(data).slice(0, 2000); });
server.stderr.on("data", (data) => { output += String(data).slice(0, 2000); });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  let response;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) throw new Error(`Next exited early: ${output}`);
    try {
      response = await fetch(`${origin}/cephalometry-lateral.html`, {
        redirect: "manual",
        signal: AbortSignal.timeout(2000),
      });
      break;
    } catch {
      await delay(350);
    }
  }
  assert.ok(response, `Next never started: ${output}`);
  assert.equal(response.status, 200, `Cephalometry route returned ${response.status} ${response.headers.get("location") ?? ""}`);
  const html = await response.text();
  assert.match(html, /<svg id="ceph"/);
  assert.match(html, /denty:ceph:ready/);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/i);
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'self'/);
  assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  console.log("PASS: production Next server serves /cephalometry-lateral.html with same-origin embedding headers.");
} finally {
  server.kill("SIGTERM");
}
