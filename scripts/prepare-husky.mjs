import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const gitPath = path.join(process.cwd(), ".git");
const isNormalGitDirectory = fs.existsSync(gitPath) && fs.statSync(gitPath).isDirectory();

if (process.env.CI || process.env.VERCEL || !isNormalGitDirectory) {
  console.log("Husky skipped outside a local Git worktree.");
  process.exit(0);
}

const command = process.platform === "win32" ? "husky.cmd" : "husky";
const binary = path.join(process.cwd(), "node_modules", ".bin", command);
const result = spawnSync(binary, [], { stdio: "inherit" });
process.exit(result.status ?? 1);
