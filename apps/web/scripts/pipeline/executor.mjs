import { spawn } from "node:child_process";
import path from "node:path";

function npmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function localBinary(root, name) {
  const executable = process.platform === "win32" ? `${name}.cmd` : name;
  return path.join(root, "node_modules", ".bin", executable);
}

function windowsCmd(command, args) {
  return {
    command: "cmd.exe",
    args: ["/d", "/c", command, ...args],
    shell: false,
  };
}

function resolveCommand(root, spec) {
  if (spec.kind === "node") {
    return {
      command: process.execPath,
      args: [...(spec.nodeArgs ?? []), path.join(root, spec.file), ...(spec.args ?? [])],
      shell: false,
    };
  }
  if (spec.kind === "npm") {
    const command = npmExecutable();
    if (process.platform === "win32") return windowsCmd(command, spec.args);
    return { command, args: spec.args, shell: false };
  }
  if (spec.kind === "bin") {
    const command = localBinary(root, spec.name);
    if (process.platform === "win32") return windowsCmd(command, spec.args);
    return { command, args: spec.args, shell: false };
  }
  throw new Error(`Unsupported command kind: ${String(spec.kind)}`);
}

function shouldRetry(stage, output, attempt) {
  const retry = stage.retry;
  if (!retry || attempt >= retry.attempts) return false;
  return retry.outputIncludes.some((fragment) => output.includes(fragment));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeStage({ root, stage, stageId, runId, emit }) {
  const startedAt = Date.now();
  const maxAttempts = stage.retry?.attempts ?? 1;
  let attempt = 0;
  let lastOutput = "";

  while (attempt < maxAttempts) {
    attempt += 1;
    await emit({
      type: "stage:start",
      stage: stageId,
      attempt,
      message: stage.description,
    });
    const { command, args, shell } = resolveCommand(root, stage.command);
    const cwd = path.resolve(root, stage.cwd ?? ".");
    const env = {
      ...process.env,
      ...stage.env,
      DENTY_PIPELINE_RUN_ID: runId,
      DENTY_PIPELINE_STAGE: stageId,
    };

    const result = await new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd,
        env,
        stdio: ["inherit", "pipe", "pipe"],
        shell,
      });
      let output = "";
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 5_000).unref();
      }, stage.timeoutMs);

      const forward = (stream, destination) => {
        stream.on("data", (chunk) => {
          const text = chunk.toString();
          output = `${output}${text}`.slice(-32_000);
          destination.write(chunk);
        });
      };
      forward(child.stdout, process.stdout);
      forward(child.stderr, process.stderr);

      child.on("error", (error) => {
        clearTimeout(timeout);
        resolve({ code: null, error, output, timedOut });
      });
      child.on("exit", (code, signal) => {
        clearTimeout(timeout);
        resolve({ code, signal, output, timedOut });
      });
    });

    lastOutput = result.output;
    if (result.code === 0 && !result.timedOut) {
      const durationMs = Date.now() - startedAt;
      await emit({ type: "stage:success", stage: stageId, attempt, durationMs });
      return { id: stageId, status: "passed", attempts: attempt, durationMs };
    }

    const retry = shouldRetry(stage, lastOutput, attempt);
    await emit({
      type: retry ? "stage:retry" : "stage:failure",
      stage: stageId,
      attempt,
      message: result.timedOut
        ? `timeout after ${stage.timeoutMs} ms`
        : `exit ${String(result.code ?? result.signal ?? "spawn-error")}`,
    });

    if (!retry) {
      const error = result.error ?? new Error(`Stage ${stageId} failed`);
      error.stageId = stageId;
      error.stageAttempts = attempt;
      error.stageDurationMs = Date.now() - startedAt;
      error.outputTail = lastOutput;
      throw error;
    }
    await delay(stage.retry.delayMs);
  }

  throw new Error(`Stage ${stageId} exhausted retries`);
}
