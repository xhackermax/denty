import { formatEUR } from "@/domain/money";
import { decisionSummary, type ComparisonTreatmentLine } from "@/domain/plan";
import type { TreatmentComparisonRecord } from "@/shared/api/schemas/clinical-arguments";

import { escapeHtml } from "./document-print";

export interface TreatmentComparisonPrintContext {
  clinicName: string;
  patientName: string;
  recordNumber?: string | null | undefined;
  date: string;
}

const list = (items: readonly string[], label: string) =>
  items.length
    ? `<div><strong>${label}</strong><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
    : "";

const treatments = (lines: readonly ComparisonTreatmentLine[]) =>
  `<ul class="treatments">${lines
    .map(
      (line) =>
        `<li><span>${escapeHtml(line.tooth ? `Diente ${line.tooth} · ${line.description}` : line.description)}</span><b>${escapeHtml(formatEUR(line.totalCents))}</b></li>`,
    )
    .join("")}</ul>`;

/**
 * The comparison handed to the patient (part V, step 06 of the clinical catalog): date,
 * professional, the alternatives with their cost, pros and cons, the decision and the version
 * of the content. It prints the saved snapshot, never the live budgets.
 */
export function buildTreatmentComparisonPrintHtml(
  record: TreatmentComparisonRecord,
  context: TreatmentComparisonPrintContext,
): string {
  const { content } = record;
  const options = content.options
    .map(
      (option) => `<section class="option${option.id === record.chosenOptionId ? " chosen" : ""}">
  <h2>${escapeHtml(`${option.label} · ${option.title}`)}</h2>
  <p class="total">${escapeHtml(formatEUR(option.totalCents))}</p>
  ${option.treatments.length ? treatments(option.treatments) : '<p class="muted">Solo los tratamientos comunes.</p>'}
  <div class="columns">${list(option.advantages, "Ventajas")}${list(option.disadvantages, "Desventajas y limitaciones")}</div>
</section>`,
    )
    .join("\n");
  const common = content.common.length
    ? `<h2>Tratamientos comunes</h2><p class="muted">Se hacen elija la opción que elija y ya están sumados en cada total.</p>${treatments(content.common)}`
    : "";
  const consequences = content.consequences.length
    ? `<h2>Si se pospone o no se trata</h2><ul>${content.consequences
        .map(
          (item) =>
            `<li><strong>${escapeHtml(item.decision)}:</strong> ${escapeHtml(item.consequence.toLowerCase())}.</li>`,
        )
        .join("")}</ul>`
    : "";
  const note = record.decisionNote.trim() ? `<p>${escapeHtml(record.decisionNote.trim())}</p>` : "";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Comparación de tratamientos · ${escapeHtml(context.patientName)}</title>
<style>
  body { font: 12pt/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1d1d1f; margin: 18mm; }
  header { border-bottom: 1px solid #d2d2d7; margin-bottom: 12pt; padding-bottom: 8pt; }
  h1 { font-size: 20pt; margin: 0 0 4pt; }
  h2 { font-size: 14pt; margin: 16pt 0 4pt; }
  .muted { color: #6e6e73; }
  .option { break-inside: avoid; border: 1px solid #e5e5ea; border-radius: 8pt; padding: 4pt 12pt 8pt; margin-top: 10pt; }
  .option.chosen { border-color: #0f766e; border-width: 2px; }
  .total { font-weight: 700; font-size: 13pt; margin: 0; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; }
  .treatments { list-style: none; padding: 0; }
  .treatments li { display: flex; justify-content: space-between; gap: 12pt; }
  ul { margin: 2pt 0 6pt; padding-left: 16pt; }
  .decision { background: #f5f5f7; padding: 8pt 12pt; border-radius: 6pt; margin-top: 16pt; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24pt; margin-top: 28pt; }
  .signatures div { border-top: 1px solid #1d1d1f; padding-top: 4pt; font-size: 10.5pt; }
  footer { margin-top: 18pt; font-size: 10pt; color: #424245; }
</style></head><body>
<header>
  <h1>Comparación de opciones de tratamiento</h1>
  <div class="muted">${escapeHtml(context.clinicName)} · ${escapeHtml(context.patientName)}${
    context.recordNumber ? ` · Ficha ${escapeHtml(context.recordNumber)}` : ""
  } · ${escapeHtml(context.date)}</div>
  <div class="muted">Profesional: ${escapeHtml(record.professionalName)}</div>
</header>
<p>Estas son las opciones que hemos valorado contigo. Las ventajas y desventajas son posibles, no garantías, y dependen de tu caso.</p>
${common}
${options}
${consequences}
<section class="decision">
  <h2>Decisión</h2>
  <p><strong>${escapeHtml(decisionSummary(record, content))}</strong></p>
  ${note}
</section>
<div class="signatures"><div>Paciente</div><div>${escapeHtml(record.professionalName)}</div></div>
<footer>Versión ${record.version} de esta comparación · catálogo clínico v${escapeHtml(record.catalogVersion)}. Este documento informa y no sustituye el consentimiento informado de cada tratamiento.</footer>
</body></html>`;
}
