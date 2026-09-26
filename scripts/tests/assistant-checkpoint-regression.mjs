import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const required = [
  "src/features/assistant/assistant-types.ts",
  "src/features/assistant/assistant-state-machine.ts",
  "src/features/assistant/assistant-provider.tsx",
  "src/features/assistant/tools/assistant-tool-registry.ts",
  "src/features/assistant/tools/local-voice-adapter.ts",
  "src/features/assistant/tools/assistant-policy.ts",
  "src/features/assistant/tools/assistant-tool-executor.ts",
  "src/features/assistant/wake-word/wake-word-engine.ts",
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Falta ${file}`);
}
const assistantSource = required.map(read).join("\n");
if (/localStorage|sessionStorage/.test(assistantSource)) throw new Error("El checkpoint no puede persistir memoria del asistente en Web Storage.");
if (!assistantSource.includes('"RED"')) throw new Error("Falta clasificación RED.");
if (!read("src/features/assistant/assistant-provider.tsx").includes("visibilitychange")) throw new Error("Falta pausa por visibilidad.");
if (!read("src/features/assistant/tools/local-voice-adapter.ts").includes("unsupported")) throw new Error("Las acciones no soportadas no pueden desaparecer en silencio.");
console.log("Oye Denty checkpoint regression OK");
