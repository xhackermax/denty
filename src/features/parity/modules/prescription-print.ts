import type { PrescriptionLine } from "@/domain/prescriptions/dental-vademecum";

/**
 * Printable prescription (A4): clinic and site header, patient, numbered
 * medicines with their regimen written as a sentence, and the prescriber's
 * signature box with the collegiate number. Built as a standalone HTML page and
 * printed from a hidden frame, so the browser's print dialog also offers
 * "Guardar como PDF".
 */

/** A medicine line as stored (every field may be missing on older records). */
export type PrintableLine = { [Key in keyof PrescriptionLine]?: string | null | undefined };

export interface PrescriptionPrintData {
  clinicName: string;
  site?: {
    name: string;
    address?: string | null | undefined;
    city?: string | null | undefined;
    phone?: string | null | undefined;
  };
  date: string;
  patient: {
    name: string;
    dni?: string | null;
    recordNumber?: string | null;
    birthDate?: string | null;
  };
  prescriber: { name: string; collegiateNumber?: string | null };
  items: readonly PrintableLine[];
  reference?: string;
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const clean = (value: string | null | undefined) => (value ?? "").trim();

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLocaleLowerCase("es") + value.slice(1) : value;
}

/** "1 comprimido cada 8 horas durante 7 días" */
export function regimenSentence(item: PrintableLine): string {
  const units = clean(item.unitsPerDose);
  const frequency = lowerFirst(clean(item.frequency));
  const duration = clean(item.duration);
  const parts = [units, frequency].filter(Boolean).join(" ");
  if (!duration) return parts;
  const joiner = /^\d/.test(duration) ? "durante " : "";
  return [parts, `${joiner}${lowerFirst(duration)}`].filter(Boolean).join(" ");
}

export function buildPrescriptionPrintHtml(data: PrescriptionPrintData): string {
  const siteLine = [
    clean(data.site?.address),
    clean(data.site?.city),
    data.site?.phone ? `Tel. ${clean(data.site.phone)}` : "",
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");
  const patientDetails = [
    data.patient.dni ? `DNI/NIE ${clean(data.patient.dni)}` : "",
    data.patient.recordNumber ? `Ficha ${clean(data.patient.recordNumber)}` : "",
    data.patient.birthDate ? `Nacimiento ${formatDate(clean(data.patient.birthDate))}` : "",
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");
  const items = data.items
    .filter((item) => clean(item.activeIngredient))
    .map((item) => {
      const title = [clean(item.activeIngredient), clean(item.strength)].filter(Boolean).join(" ");
      const presentation = [clean(item.pharmaceuticalForm), clean(item.route)]
        .filter(Boolean)
        .join(" · ");
      return `<li>
        <div class="drug">${escapeHtml(title)}${presentation ? ` <span>${escapeHtml(presentation)}</span>` : ""}</div>
        <div class="regimen">${escapeHtml(regimenSentence(item))}${clean(item.packageCount) ? ` <span class="packages">· Dispensar: ${escapeHtml(clean(item.packageCount))}</span>` : ""}</div>
        ${clean(item.instructions) ? `<div class="notes">${escapeHtml(clean(item.instructions))}</div>` : ""}
      </li>`;
    })
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Receta · ${escapeHtml(data.patient.name)}</title>
<style>
  @page { size: A4; margin: 16mm 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 11pt/1.45 "Helvetica Neue", Arial, sans-serif; color: #111; }
  header { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 10px; border-bottom: 2px solid #111; }
  .clinic { font-size: 16pt; font-weight: 700; }
  .site { font-size: 9.5pt; color: #333; }
  .meta { text-align: right; font-size: 10pt; }
  .meta b { display: block; font-size: 14pt; letter-spacing: 0.04em; }
  .patient { margin: 14px 0 6px; font-size: 10.5pt; }
  .patient b { font-size: 12pt; }
  .patient div { color: #333; }
  .rp { margin-top: 16px; font-size: 15pt; font-weight: 700; font-style: italic; }
  ol { margin: 6px 0 0; padding-left: 22px; }
  li { margin: 0 0 12px; padding-left: 4px; }
  .drug { font-weight: 700; font-size: 12pt; }
  .drug span { font-weight: 400; font-size: 10pt; color: #333; }
  .regimen { margin-top: 2px; }
  .packages { color: #333; }
  .notes { margin-top: 2px; font-style: italic; color: #333; }
  footer { margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
  .validity { font-size: 9pt; color: #333; max-width: 90mm; }
  .signature { width: 70mm; text-align: center; font-size: 10pt; }
  .signature .box { height: 26mm; border-bottom: 1px solid #111; }
  .signature b { display: block; margin-top: 6px; font-size: 10.5pt; }
  .reference { margin-top: 18px; font-size: 8pt; color: #666; }
</style>
</head>
<body>
  <header>
    <div>
      <div class="clinic">${escapeHtml(data.clinicName)}</div>
      ${data.site ? `<div class="site">${escapeHtml(data.site.name)}${siteLine ? ` · ${siteLine}` : ""}</div>` : ""}
    </div>
    <div class="meta"><b>RECETA</b>${escapeHtml(formatDate(data.date))}</div>
  </header>
  <section class="patient">
    Paciente: <b>${escapeHtml(data.patient.name)}</b>
    ${patientDetails ? `<div>${patientDetails}</div>` : ""}
  </section>
  <div class="rp">Rp./</div>
  <ol>${items}</ol>
  <footer>
    <div class="validity">Validez: 10 días naturales desde la fecha de prescripción. Receta de dispensación en oficina de farmacia (RD 1718/2010).</div>
    <div class="signature">
      <div class="box"></div>
      <b>${escapeHtml(data.prescriber.name)}</b>
      Odontólogo/a<br>
      ${data.prescriber.collegiateNumber ? `Nº de colegiado ${escapeHtml(clean(data.prescriber.collegiateNumber))}` : "Nº de colegiado ____________"}
    </div>
  </footer>
  ${data.reference ? `<div class="reference">Ref. ${escapeHtml(data.reference)}</div>` : ""}
</body>
</html>`;
}

export { printHtml } from "@/shared/print/print-html";
