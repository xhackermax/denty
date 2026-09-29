type Medication = {
  activeIngredient?: string;
  brandName?: string;
  strength: string;
  pharmaceuticalForm: string;
  route?: string;
  unitsPerDose: string;
  frequency: string;
  duration: string;
  instructions?: string;
};

type PrescriptionPdfRecord = {
  id: string;
  status: string;
  prescriptionDate?: string;
  patientInformation?: string | null;
  patientSnapshotJson?: Record<string, unknown>;
  prescriberSnapshotJson?: Record<string, unknown>;
  issuedAt?: string | null;
  items: Medication[];
};

const WIN_ANSI_EXTRAS = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

function encodeWinAnsi(value: string): string {
  return Array.from(value.normalize("NFC"), (character) => {
    const code = character.codePointAt(0) ?? 0x3f;
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff))
      return String.fromCharCode(code);
    const mapped = WIN_ANSI_EXTRAS.get(code);
    return mapped === undefined ? "?" : String.fromCharCode(mapped);
  }).join("");
}

const esc = (value: string) =>
  encodeWinAnsi(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");

const text = (value: unknown) => (typeof value === "string" ? value : "");

export function buildPrescriptionPdf(prescription: PrescriptionPdfRecord): Uint8Array {
  const patient = prescription.patientSnapshotJson ?? {};
  const prescriber = prescription.prescriberSnapshotJson ?? {};
  const patientName = `${text(patient.firstName)} ${text(patient.lastName)}`.trim();
  const medicationLines = prescription.items.flatMap((item, index) => {
    const drug = item.brandName || item.activeIngredient || "Medicamento";
    return [
      `${index + 1}. ${drug} ${item.strength} - ${item.pharmaceuticalForm}`,
      `   ${item.unitsPerDose}; ${item.frequency}; ${item.duration}${item.route ? `; ${item.route}` : ""}`,
      ...(item.instructions ? [`   Indicaciones: ${item.instructions}`] : []),
    ];
  });
  const lines = [
    "RECETA MEDICA",
    `Referencia: ${prescription.id}`,
    `Estado: ${prescription.status}`,
    `Fecha: ${prescription.prescriptionDate ?? ""}`,
    patientName ? `Paciente: ${patientName}` : "",
    text(patient.dni) ? `DNI/NIE: ${text(patient.dni)}` : "",
    text(prescriber.displayName) ? `Prescriptor: ${text(prescriber.displayName)}` : "",
    text(prescriber.licenseNumber) ? `Colegiado: ${text(prescriber.licenseNumber)}` : "",
    prescription.patientInformation ? `Informacion: ${prescription.patientInformation}` : "",
    ...medicationLines,
    prescription.issuedAt ? `Emitida: ${prescription.issuedAt}` : "",
  ].filter(Boolean);

  const commands = lines.map((line, index) => `${index ? "T* " : ""}(${esc(line)}) Tj`).join(" ");
  const stream = `BT /F1 10 Tf 45 800 Td 13 TL ${commands} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(output.length);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets
    .slice(1)
    .map((value) => `${String(value).padStart(10, "0")} 00000 n \n`)
    .join("");
  output += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Uint8Array.from(Array.from(output), (character) => character.charCodeAt(0) & 0xff);
}
