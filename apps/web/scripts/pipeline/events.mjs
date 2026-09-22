import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function safeName(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function createEventReporter({ root, runId, target }) {
  const directory = path.join(root, ".artifacts", "pipeline");
  await mkdir(directory, { recursive: true });
  const base = `${safeName(target)}-${safeName(runId)}`;
  const eventsFile = path.join(directory, `${base}.ndjson`);
  const jsonFile = path.join(directory, `${base}.json`);
  const markdownFile = path.join(directory, `${base}.md`);
  const events = [];

  async function emit(event) {
    const enriched = Object.freeze({
      runId,
      target,
      at: new Date().toISOString(),
      ...event,
    });
    events.push(enriched);
    await appendFile(eventsFile, `${JSON.stringify(enriched)}\n`);

    const label = event.stage ? ` ${event.stage}` : "";
    const detail = event.message ? `: ${event.message}` : "";
    console.log(`[pipeline ${runId}] ${event.type}${label}${detail}`);
  }

  async function finalize(summary) {
    const report = { runId, target, ...summary, events };
    await writeFile(jsonFile, `${JSON.stringify(report, null, 2)}\n`);

    const rows = summary.stages.map(
      (stage) => `| ${stage.id} | ${stage.status} | ${stage.attempts} | ${stage.durationMs} |`,
    );
    const markdown = [
      `# Denty pipeline report`,
      "",
      `- Run: \`${runId}\``,
      `- Target: \`${target}\``,
      `- Status: **${summary.status}**`,
      `- Duration: ${summary.durationMs} ms`,
      "",
      "| Stage | Status | Attempts | Duration ms |",
      "|---|---:|---:|---:|",
      ...rows,
      "",
    ].join("\n");
    await writeFile(markdownFile, markdown);

    return { eventsFile, jsonFile, markdownFile };
  }

  return { emit, finalize };
}
