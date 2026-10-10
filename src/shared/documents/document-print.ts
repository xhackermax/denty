import { parseTemplate, shortDate, type TemplateValues } from "./template-render";

/**
 * Printable clinical document (consent, authorisation, certificate): clinic and
 * site letterhead, title, patient data, the template text and the signature
 * boxes. Signed documents state who signed electronically and when.
 */

export interface DocumentPrintData {
  kind: "consent" | "certificate" | "debt" | "privacy";
  clinicName: string;
  site?: {
    name: string;
    address?: string | null | undefined;
    city?: string | null | undefined;
    phone?: string | null | undefined;
  };
  title: string;
  body: string;
  values: TemplateValues;
  date: string;
  patient: { name: string; dni?: string | null; recordNumber?: string | null };
  doctor: { name: string; collegiateNumber?: string | null };
  signed?: { signerName: string; signedAt: string } | null;
  signatureImageDataUrl?: string | undefined;
  reference?: string;
}

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export function renderTemplateHtml(body: string, values: TemplateValues): string {
  return parseTemplate(body, values)
    .map((block) => {
      if (block.kind === "heading") return `<h2>${escapeHtml(block.text)}</h2>`;
      if (block.kind === "list")
        return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
      return `<p>${escapeHtml(block.text)}</p>`;
    })
    .join("\n");
}

export function buildDocumentPrintHtml(data: DocumentPrintData): string {
  const siteLine = [
    data.site?.address,
    data.site?.city,
    data.site?.phone ? `Tel. ${data.site.phone}` : "",
  ]
    .map((value) => (value ?? "").trim())
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");
  const patientDetails = [
    data.patient.dni ? `DNI/NIE ${data.patient.dni}` : "",
    data.patient.recordNumber ? `Ficha ${data.patient.recordNumber}` : "",
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");
  const doctorLine = `${escapeHtml(data.doctor.name)}${
    data.doctor.collegiateNumber
      ? `<br>Nº de colegiado ${escapeHtml(data.doctor.collegiateNumber)}`
      : ""
  }`;
  const signatures =
    data.kind === "debt" || data.kind === "privacy"
      ? `<section class="signatures single">
          <div class="signature">
            <div class="box">${data.signatureImageDataUrl?.match(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/)
              ? `<img class="signatureImage" src="${escapeHtml(data.signatureImageDataUrl)}" alt="Firma manuscrita digitalizada del deudor">`
              : ""}${data.signed
              ? `<span class="esign">${data.kind === "privacy" ? "Firma de recepción de información ·" : "Firma electrónica simple ·"}
              ${escapeHtml(data.signed.signerName)} · ${escapeHtml(shortDate(data.signed.signedAt))}</span>`
              : ""}</div>
            <b>${data.kind === "privacy" ? "Paciente que recibe la información" : "Paciente/deudor"}</b>
            ${escapeHtml(data.signed?.signerName ?? data.patient.name)}
          </div>
        </section>`
      : data.kind === "consent"
      ? `<section class="signatures">
          <div class="signature">
            <div class="box">${
              data.signed
                ? `<span class="esign">Firmado electrónicamente por ${escapeHtml(data.signed.signerName)}<br>el ${escapeHtml(shortDate(data.signed.signedAt))}</span>`
                : ""
            }</div>
            <b>Paciente o representante legal</b>
            ${escapeHtml(data.signed?.signerName ?? data.patient.name)}
          </div>
          <div class="signature">
            <div class="box"></div>
            <b>Profesional</b>
            ${doctorLine}
          </div>
        </section>
        <section class="revoke">
          <h2>Revocación</h2>
          <p>Revoco el consentimiento prestado en este documento con fecha ____ / ____ / ________.</p>
          <p>Firma del paciente o representante: ______________________________</p>
        </section>`
      : `<section class="signatures single">
          <div class="signature">
            <div class="box"></div>
            <b>Firma y sello</b>
            ${doctorLine}
          </div>
        </section>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapeHtml(data.title)} · ${escapeHtml(data.patient.name)}</title>
<style>
  @page { size: A4; margin: 16mm 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 10.5pt/1.5 "Helvetica Neue", Arial, sans-serif; color: #111; }
  header { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 10px; border-bottom: 2px solid #111; }
  .clinic { font-size: 15pt; font-weight: 700; }
  .site { font-size: 9pt; color: #333; }
  .meta { text-align: right; font-size: 9.5pt; }
  h1 { margin: 16px 0 4px; font-size: 14pt; }
  .patient { margin-bottom: 10px; font-size: 10pt; color: #333; }
  .patient b { color: #111; font-size: 11pt; }
  h2 { margin: 14px 0 4px; font-size: 11pt; break-after: avoid; }
  p { margin: 0 0 8px; text-align: justify; }
  ul { margin: 0 0 8px; padding-left: 20px; }
  li { margin-bottom: 3px; }
  .signatures { display: flex; gap: 24px; justify-content: space-between; margin-top: 28px; break-inside: avoid; }
  .signatures.single { justify-content: flex-end; }
  .signature { width: 75mm; text-align: center; font-size: 9.5pt; }
  .signature .box { position: relative; height: 26mm; border-bottom: 1px solid #111; }
  .signature b { display: block; margin-top: 6px; font-size: 10pt; }
  .esign { position: absolute; inset: auto 0 2px; font-size: 8pt; color: #075a45; }
  .signatureImage { display:block;max-height:18mm;max-width:70mm;margin:auto;object-fit:contain; }
  .revoke { margin-top: 26px; padding-top: 8px; border-top: 1px dashed #888; font-size: 9pt; color: #333; break-inside: avoid; }
  .revoke h2 { font-size: 10pt; }
  .reference { margin-top: 14px; font-size: 7.5pt; color: #777; }
</style>
</head>
<body>
  <header>
    <div>
      <div class="clinic">${escapeHtml(data.clinicName)}</div>
      ${data.site ? `<div class="site">${escapeHtml(data.site.name)}${siteLine ? ` · ${siteLine}` : ""}</div>` : ""}
    </div>
    <div class="meta">${escapeHtml(shortDate(data.date))}</div>
  </header>
  <h1>${escapeHtml(data.title)}</h1>
  <div class="patient">Paciente: <b>${escapeHtml(data.patient.name)}</b>${patientDetails ? ` · ${patientDetails}` : ""}</div>
  ${renderTemplateHtml(data.body, data.values)}
  ${signatures}
  ${data.reference ? `<div class="reference">Ref. ${escapeHtml(data.reference)}</div>` : ""}
</body>
</html>`;
}
