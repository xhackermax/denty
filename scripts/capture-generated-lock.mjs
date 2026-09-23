import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "package-lock.json");
const target = path.join(root, ".artifacts", "bootstrap", "package-lock.json");

if (!fs.existsSync(source)) {
  throw new Error("npm did not generate package-lock.json before npm ci");
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
console.log("Bootstrap lock captured at .artifacts/bootstrap/package-lock.json");
