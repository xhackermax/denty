import fs from "node:fs";
import assert from "node:assert/strict";

const executor = fs.readFileSync("src/features/voice/voice-executor.ts", "utf8");
const nlu = fs.readFileSync("src/features/voice/local-nlu.ts", "utf8");
const router = fs.readFileSync("src/features/voice/voice-router.ts", "utf8");
const adapter = fs.readFileSync("src/features/assistant/tools/local-voice-adapter.ts", "utf8");
assert.match(adapter, /unsupported/, "Tool adapter must report unsupported actions");

assert.ok(
  executor.includes("EXECUTABLE_VOICE_ACTION_TYPES"),
  "Voice executor must publish the supported action contract",
);
assert.ok(
  executor.includes("isExecutableVoiceAction"),
  "Voice executor must expose executable-action guard",
);
assert.ok(
  router.includes("localVoicePlanToToolCalls"),
  "Voice preview must consult the canonical tool adapter",
);
assert.ok(
  router.includes("unsupportedActions"),
  "Voice preview must report unsupported actions before confirmation",
);
assert.ok(router.includes("canExecuteVoicePreview"), "Voice execution gate missing");
assert.match(
  router,
  /unsupportedActions\.length\s*===\s*0/,
  "Voice preview must refuse unsupported actions",
);
assert.match(nlu, /requiresConfirmation:/, "Voice planner confirmation contract missing");
assert.ok(
  nlu.includes("método de pago"),
  "Voice planner must flag a missing payment method before confirmation",
);
assert.match(
  executor,
  /payment\.record[\s\S]{0,500}amountCents[\s\S]{0,500}method/,
  "Voice executable guard must validate payment payload readiness",
);
assert.ok(
  !/No se ha aplicado ninguna confirmación ficticia/.test(executor),
  "Unsupported action rejection must happen before execution, not after partial execution",
);

console.log("Stage 12 voice capability contract PASS");
