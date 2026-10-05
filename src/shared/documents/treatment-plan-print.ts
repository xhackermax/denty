import { formatEUR } from "@/domain/money";
import type { TreatmentPlanDocument } from "@/domain/plan/treatment-plan-document";

import { escapeHtml } from "./document-print";

export interface TreatmentPlanPrintContext {
  clinicName: string;
  patientName: string;
  recordNumber?: string | null | undefined;
  date: string;
}

const list = (items: readonly string[]) =>
  `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

/** Printable treatment plan for the patient: one page per phase at most, large readable type. */
export function buildTreatmentPlanPrintHtml(
  document: TreatmentPlanDocument,
  context: TreatmentPlanPrintContext,
): string {
  const phases = document.phases
    .map(
      (phase) => `<section class="phase">
  <h2>${escapeHtml(phase.title)}</h2>
  <p class="purpose">${escapeHtml(phase.purpose)}</p>
  ${phase.steps
    .map(
      (step) => `<article class="step">
    <h3>${step.order}. ${escapeHtml(step.guide.name)}${
      step.teeth.length
        ? ` <span class="teeth">· dientes ${escapeHtml(step.teeth.join(", "))}</span>`
        : ""
    }</h3>
    <p><strong>Qué es.</strong> ${escapeHtml(step.guide.what)}</p>
    <p><strong>Por qué lo necesitas.</strong> ${escapeHtml(step.guide.why)}</p>
    <div class="columns">
      <div><strong>Ventajas</strong>${list(step.guide.benefits)}</div>
      <div><strong>Inconvenientes y riesgos</strong>${list(step.guide.drawbacks)}</div>
    </div>
    <p><strong>Otras opciones.</strong> ${escapeHtml(step.guide.alternatives)}</p>
    <p><strong>Si no se hace.</strong> ${escapeHtml(step.guide.ifNotDone)}</p>
    <p class="meta"><strong>Por qué en este orden.</strong> ${escapeHtml(step.orderReason)} · ${escapeHtml(step.guide.visits)}${
      step.priceCents ? ` · ${escapeHtml(formatEUR(step.priceCents))}` : ""
    }</p>
  </article>`,
    )
    .join("\n")}
  <p class="total">Total ${escapeHtml(phase.title.split(" · ")[0] ?? "")}: ${escapeHtml(formatEUR(phase.totalCents))}</p>
</section>`,
    )
    .join("\n");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Plan de tratamiento · ${escapeHtml(context.patientName)}</title>
<style>
  body { font: 12pt/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1d1d1f; margin: 18mm; }
  header { border-bottom: 1px solid #d2d2d7; margin-bottom: 12pt; padding-bottom: 8pt; }
  h1 { font-size: 20pt; margin: 0 0 4pt; }
  h2 { font-size: 15pt; margin: 18pt 0 4pt; }
  h3 { font-size: 13pt; margin: 12pt 0 4pt; }
  .teeth, .muted { color: #6e6e73; font-weight: 400; }
  .purpose { background: #f5f5f7; padding: 8pt 10pt; border-radius: 6pt; }
  .step { break-inside: avoid; border-top: 1px solid #e5e5ea; padding-top: 6pt; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; }
  ul { margin: 2pt 0 6pt; padding-left: 16pt; }
  .meta { color: #424245; font-size: 11pt; }
  .total { text-align: right; font-weight: 700; }
  .order li { margin-bottom: 2pt; }
  footer { margin-top: 18pt; font-size: 10.5pt; color: #424245; }
</style></head><body>
<header>
  <h1>Tu plan de tratamiento</h1>
  <div class="muted">${escapeHtml(context.clinicName)} · ${escapeHtml(context.patientName)}${
    context.recordNumber ? ` · Ficha ${escapeHtml(context.recordNumber)}` : ""
  } · ${escapeHtml(context.date)}</div>
</header>
<p>${escapeHtml(document.intro)}</p>
<h2>Cómo lo hemos ordenado</h2>
<ol class="order">${document.orderSummary.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ol>
${phases}
<p class="total">Total del plan: ${escapeHtml(formatEUR(document.totalCents))}</p>
<h2>Después del tratamiento</h2>
<p>${escapeHtml(document.maintenance)}</p>
<footer>${escapeHtml(document.closing)}</footer>
</body></html>`;
}
