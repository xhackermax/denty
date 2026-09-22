import { spawn } from "node:child_process";
import { access, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, ".artifacts", "vercel-package", "root");
const output = path.join(root, ".artifacts", "DENTY-V3-VERCEL-VERIFIED.zip");
await access(source);
await rm(output, { force: true });

const result = await new Promise((resolve) => {
  const child = spawn("zip", ["-qr", output, "."], { cwd: source, stdio: "inherit" });
  child.on("error", (error) => resolve({ code: null, error }));
  child.on("exit", (code) => resolve({ code }));
});

if (result.code !== 0) {
  throw result.error ?? new Error(`zip exited with ${String(result.code)}`);
}
console.log(`Created ${path.relative(root, output)}`);
