import type { DentalEntity } from "@/domain";
import { dateDMY, epochMillis, hhmm } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import {
  buildTreatmentPlanDocument,
  type TreatmentPlanItem,
} from "@/domain/plan/treatment-plan-document";
import { AGENDA_STATUS_META } from "@/features/agenda/agenda-status";
import { buildOdontogramVisitSummary } from "@/features/odontogram/odontogram-visit-summary";
import type { Appointment } from "@/shared/api";
import type { TreatmentComparisonRecord } from "@/shared/api/schemas/clinical-arguments";
import { escapeHtml } from "@/shared/documents/document-print";
import { buildTreatmentComparisonPrintHtml } from "@/shared/documents/treatment-comparison-print";
import { buildTreatmentPlanPrintHtml } from "@/shared/documents/treatment-plan-print";
import { TOOTH_STATE_LABELS } from "@/shared/odontogram/tooth-state-labels";
import { embedPrintDocument } from "@/shared/print/embed-print-document";

export interface DossierBudget {
  code: string;
  title?: string | null | undefined;
  status: string;
  totalCents: number;
  createdAt?: string | undefined;
  items: readonly {
    description: string;
    tooth?: string | null | undefined;
    totalCents: number;
  }[];
}

export interface DossierDocument {
  title: string;
  type: string;
  status: string;
  createdAt: string;
  signedAt?: string | null | undefined;
  /** The printable page of the document; null for uploaded files, which only get listed. */
  html: string | null;
}

export interface PatientDossierInput {
  clinicName: string;
  /** Day the dossier is printed, already formatted (dd/mm/aaaa). */
  date: string;
  patient: {
    name: string;
    recordNumber?: string | null | undefined;
    dni?: string | null | undefined;
    birthDate?: string | null | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
  };
  medicalAlerts: readonly string[];
  odontogram: readonly DentalEntity[];
  planItems: readonly TreatmentPlanItem[];
  comparisons: readonly TreatmentComparisonRecord[];
  budgets: readonly DossierBudget[];
  appointments: readonly Appointment[];
  documents: readonly DossierDocument[];
}

const BUDGET_STATUS: Readonly<Record<string, string>> = {
  DRAFT: "Borrador",
  SIGNED: "Firmado",
  DEFERRED: "Aplazado",
  REJECTED: "Rechazado",
  SUPERSEDED: "Sustituido",
  CANCELLED: "Anulado",
};

const DOCUMENT_TYPE: Readonly<Record<string, string>> = {
  BUDGET: "Presupuesto",
  CONSENT: "Consentimiento",
  CERTIFICATE: "Justificante",
  CLINICAL_DOCUMENT: "Documento clínico",
  DEBT_ACKNOWLEDGEMENT: "Reconocimiento de deuda",
  PRIVACY_NOTICE: "Protección de datos",
};

const DOCUMENT_STATUS: Readonly<Record<string, string>> = {
  DRAFT: "Borrador",
  FINAL: "Final",
  FINALIZED: "Final",
  SIGNED: "Firmado",
  DELIVERED: "Entregado",
  ARCHIVED: "Archivado",
};

const PERMANENT_ROWS = [
  ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"],
  ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"],
];
const PRIMARY_ROWS = [
  ["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"],
  ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"],
];

const count = (value: number, one: string, many: string) => `${value} ${value === 1 ? one : many}`;

const esc = (value: string | null | undefined) => escapeHtml(value ?? "");

function entityLabel(entity: DentalEntity): string {
  const label = TOOTH_STATE_LABELS[entity.status as keyof typeof TOOTH_STATE_LABELS];
  return label ?? entity.entityType.replaceAll("_", " ").toLowerCase();
}

/** What the chart shows on each tooth, so the printed grid reads like the odontogram. */
function findingsByTooth(entities: readonly DentalEntity[]): Map<string, string[]> {
  const byTooth = new Map<string, string[]>();
  for (const entity of entities) {
    if (!entity.active || !entity.tooth || entity.status === "healthy") continue;
    const labels = byTooth.get(entity.tooth) ?? [];
    const label = entityLabel(entity);
    if (!labels.includes(label)) labels.push(label);
    byTooth.set(entity.tooth, labels);
  }
  return byTooth;
}

function toothGrid(rows: readonly (readonly string[])[], findings: Map<string, string[]>): string {
  return `<table class="teeth">${rows
    .map(
      (row) =>
        `<tr>${row
          .map((tooth) => {
            const labels = findings.get(tooth) ?? [];
            return `<td class="${labels.length ? "marked" : ""}"><b>${tooth}</b>${labels
              .map((label) => `<small>${esc(label)}</small>`)
              .join("")}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("")}</table>`;
}

function odontogramSection(entities: readonly DentalEntity[]): string {
  const findings = findingsByTooth(entities);
  const hasPrimary = PRIMARY_ROWS.flat().some((tooth) => findings.has(tooth));
  const summary = buildOdontogramVisitSummary(entities);
  const lines = summary.findingCount
    ? `<ul>${summary.text
        .split("\n")
        .map((line) => `<li>${esc(line)}</li>`)
        .join("")}</ul>`
    : `<p class="muted">${esc(summary.text)}</p>`;
  return `${toothGrid(PERMANENT_ROWS, findings)}${
    hasPrimary ? `<h3>Dentición temporal</h3>${toothGrid(PRIMARY_ROWS, findings)}` : ""
  }<h3>Hallazgos registrados</h3>${lines}`;
}

function budgetsSection(budgets: readonly DossierBudget[]): string {
  return budgets
    .map(
      (budget) => `<article class="budget">
  <h3>${esc(budget.title?.trim() || `Presupuesto ${budget.code}`)}</h3>
  <p class="muted">${esc(budget.code)} · ${esc(BUDGET_STATUS[budget.status] ?? budget.status)}${
    budget.createdAt ? ` · ${esc(dateDMY(budget.createdAt))}` : ""
  }</p>
  <table class="lines">${budget.items
    .map(
      (item) =>
        `<tr><td>${esc(item.tooth ? `Diente ${item.tooth} · ${item.description}` : item.description)}</td><td class="amount">${esc(formatEUR(item.totalCents))}</td></tr>`,
    )
    .join(
      "",
    )}<tr class="total"><td>Total</td><td class="amount">${esc(formatEUR(budget.totalCents))}</td></tr></table>
</article>`,
    )
    .join("\n");
}

function appointmentsSection(appointments: readonly Appointment[]): string {
  const rows = [...appointments]
    .sort((left, right) => epochMillis(right.startsAt) - epochMillis(left.startsAt))
    .map(
      (appointment) =>
        `<tr><td>${esc(dateDMY(appointment.startsAt))}</td><td>${esc(hhmm(appointment.startsAt))}</td><td>${esc(appointment.reason ?? appointment.title)}</td><td>${esc(AGENDA_STATUS_META[appointment.status].label)}</td></tr>`,
    )
    .join("");
  return `<table class="list"><thead><tr><th>Fecha</th><th>Hora</th><th>Motivo</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function documentRow(document: DossierDocument): string {
  const status = DOCUMENT_STATUS[document.status] ?? document.status;
  const signed = document.signedAt ? ` · ${dateDMY(document.signedAt)}` : "";
  return `<tr><td>${esc(document.title)}</td><td>${esc(DOCUMENT_TYPE[document.type] ?? document.type)}</td><td>${esc(dateDMY(document.createdAt))}</td><td>${esc(`${status}${signed}`)}${
    document.html ? "" : ' <span class="muted">(archivo adjunto, no incluido)</span>'
  }</td></tr>`;
}

/** Of each saved comparison only its latest version counts: older ones were replaced. */
function latestComparisons(
  records: readonly TreatmentComparisonRecord[],
): TreatmentComparisonRecord[] {
  const latest = new Map<string, TreatmentComparisonRecord>();
  for (const record of records) {
    const current = latest.get(record.seriesId);
    if (!current || record.version > current.version) latest.set(record.seriesId, record);
  }
  return [...latest.values()].sort(
    (left, right) => epochMillis(right.createdAt) - epochMillis(left.createdAt),
  );
}

interface Section {
  id: string;
  title: string;
  summary: string;
  body: string;
}

/**
 * "Dossier de <paciente>": everything printable about one patient in a single document, so the
 * clinic does not have to print the odontogram, plan, comparisons, budgets, appointments and
 * documents one by one. Plans, comparisons and documents reuse their own printable pages
 * unchanged; each part starts on a new page.
 */
export function buildPatientDossierHtml(input: PatientDossierInput): string {
  const { patient } = input;
  const plan = buildTreatmentPlanDocument(input.planItems, { patientName: patient.name });
  const comparisons = latestComparisons(input.comparisons);
  const printable = input.documents.filter((document) => document.html);
  let part = 0;
  const embed = (html: string) => embedPrintDocument(html, `dossier-part-${(part += 1)}`);
  const empty = (text: string) => `<p class="muted">${esc(text)}</p>`;
  const printContext = {
    clinicName: input.clinicName,
    patientName: patient.name,
    recordNumber: patient.recordNumber ?? null,
  };

  const sections: Section[] = [
    {
      id: "odontograma",
      title: "Odontograma",
      summary: count(
        findingsByTooth(input.odontogram).size,
        "diente con hallazgos",
        "dientes con hallazgos",
      ),
      body: odontogramSection(input.odontogram),
    },
    {
      id: "plan",
      title: "Plan de tratamiento",
      summary: plan.phases.length
        ? `${count(plan.phases.length, "fase", "fases")} · ${formatEUR(plan.totalCents)}`
        : "Sin tratamientos pendientes",
      body: plan.phases.length
        ? embed(buildTreatmentPlanPrintHtml(plan, { ...printContext, date: input.date }))
        : empty("No hay tratamientos pendientes en el plan."),
    },
    {
      id: "comparaciones",
      title: "Comparación y decisión de tratamiento",
      summary: comparisons.length
        ? count(comparisons.length, "guardada", "guardadas")
        : "Ninguna guardada",
      body: comparisons.length
        ? comparisons
            .map((record) =>
              embed(
                buildTreatmentComparisonPrintHtml(record, {
                  ...printContext,
                  date: dateDMY(record.createdAt),
                }),
              ),
            )
            .join('\n<div class="page-break"></div>\n')
        : empty("Todavía no se ha guardado ninguna comparación."),
    },
    {
      id: "presupuestos",
      title: "Presupuestos",
      summary: input.budgets.length
        ? count(input.budgets.length, "presupuesto", "presupuestos")
        : "Sin presupuestos",
      body: input.budgets.length
        ? budgetsSection(input.budgets)
        : empty("El paciente no tiene presupuestos."),
    },
    {
      id: "citas",
      title: "Citas",
      summary: input.appointments.length
        ? count(input.appointments.length, "cita", "citas")
        : "Sin citas",
      body: input.appointments.length
        ? appointmentsSection(input.appointments)
        : empty("El paciente no tiene citas registradas."),
    },
    {
      id: "documentos",
      title: "Documentos",
      summary: input.documents.length
        ? `${count(input.documents.length, "documento", "documentos")} · ${count(printable.length, "incluido", "incluidos")}`
        : "Sin documentos",
      body: input.documents.length
        ? `<table class="list"><thead><tr><th>Documento</th><th>Tipo</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>${input.documents
            .map(documentRow)
            .join("")}</tbody></table>${printable
            .map((document) => `<div class="page-break"></div>${embed(document.html ?? "")}`)
            .join("\n")}`
        : empty("El paciente no tiene documentos."),
    },
  ];

  const details = [
    patient.recordNumber ? `Ficha ${patient.recordNumber}` : "",
    patient.dni ? `DNI/NIE ${patient.dni}` : "",
    patient.birthDate ? `Nacimiento ${dateDMY(patient.birthDate)}` : "",
    patient.phone ?? "",
    patient.email ?? "",
  ].filter(Boolean);
  const title = `Dossier de ${patient.name}`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 16mm 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 11pt/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1d1d1f; }
  .cover { border-bottom: 2px solid #1d1d1f; padding-bottom: 10pt; margin-bottom: 14pt; }
  .cover .clinic { font-weight: 700; font-size: 12pt; }
  .cover h1 { font-size: 24pt; margin: 18pt 0 4pt; }
  .muted { color: #6e6e73; }
  .alerts { margin: 10pt 0; padding: 8pt 12pt; border: 1px solid #f0b7b7; border-radius: 6pt; background: #fff5f5; }
  .index { width: 100%; border-collapse: collapse; margin-top: 10pt; }
  .index td { padding: 6pt 4pt; border-bottom: 1px solid #e5e5ea; }
  .index td:last-child { text-align: right; color: #6e6e73; }
  .part { break-before: page; }
  .part > h2 { font-size: 18pt; margin: 0 0 10pt; padding-bottom: 6pt; border-bottom: 1px solid #d2d2d7; }
  .part-title { font-size: 9pt; color: #6e6e73; text-transform: uppercase; letter-spacing: .06em; }
  .page-break { break-before: page; }
  .teeth { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 8pt; }
  .teeth td { border: 1px solid #d2d2d7; vertical-align: top; padding: 3pt; height: 34pt; font-size: 8pt; }
  .teeth td b { display: block; font-size: 9pt; }
  .teeth td small { display: block; line-height: 1.2; }
  .teeth td.marked { background: #f2f7ff; }
  .teeth tr:first-child td { border-bottom: 2px solid #1d1d1f; }
  .budget { break-inside: avoid; margin-bottom: 14pt; }
  .budget h3 { margin: 0; }
  .budget p { margin: 0 0 4pt; }
  .lines, .list { width: 100%; border-collapse: collapse; }
  .lines td, .list td, .list th { padding: 4pt; border-bottom: 1px solid #e5e5ea; text-align: left; }
  .list th { background: #f5f5f7; font-size: 10pt; }
  .amount { text-align: right; white-space: nowrap; }
  .lines .total td { font-weight: 700; border-top: 1px solid #1d1d1f; }
</style></head><body>
<header class="cover">
  <div class="clinic">${esc(input.clinicName)}</div>
  <h1>${esc(title)}</h1>
  <div class="muted">${details.map(esc).join(" · ")}</div>
  <div class="muted">Generado el ${esc(input.date)}</div>
</header>
${
  input.medicalAlerts.length
    ? `<div class="alerts"><strong>Alertas clínicas:</strong> ${input.medicalAlerts.map(esc).join(" · ")}</div>`
    : ""
}
<h2>Contenido</h2>
<table class="index">${sections
    .map(
      (section, index) =>
        `<tr><td>${index + 1}. ${esc(section.title)}</td><td>${esc(section.summary)}</td></tr>`,
    )
    .join("")}</table>
${sections
  .map(
    (section, index) => `<section class="part" id="${section.id}">
  <div class="part-title">${esc(title)} · ${index + 1}/${sections.length}</div>
  <h2>${esc(section.title)}</h2>
  ${section.body}
</section>`,
  )
  .join("\n")}
</body></html>`;
}
