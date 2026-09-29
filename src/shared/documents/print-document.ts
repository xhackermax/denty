import { todayMadrid } from "@/domain/dates";
import { printHtml } from "@/shared/print/print-html";

import { documentValues, type DocumentDoctor } from "./document-context";
import { buildDocumentPrintHtml, type DocumentPrintData } from "./document-print";

type Context = {
  clinicName: string;
  site?: DocumentPrintData["site"] | undefined;
  doctorById: (id: string | null | undefined) => DocumentDoctor | null;
  defaultDoctorId: string | null;
};

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : undefined);

/**
 * Prints a consent, authorisation or certificate from its template and the data
 * saved with the document (doctor, treatment, times…).
 */
export function printClinicalDocument(input: {
  title: string;
  templateCode?: string | null | undefined;
  templateBody: string;
  patient: {
    firstName: string;
    lastName: string;
    dni?: string | null | undefined;
    recordNumber?: string | null | undefined;
  };
  context: Context;
  data?: Record<string, unknown> | undefined;
  signed?: { signerName: string; signedAt: string } | null;
  createdAt?: string | undefined;
  reference?: string | undefined;
}) {
  const data = input.data ?? {};
  const doctor =
    input.context.doctorById(text(data.doctorId)) ??
    input.context.doctorById(input.context.defaultDoctorId);
  const date = text(data.fecha) ?? input.createdAt?.slice(0, 10) ?? todayMadrid();
  const values = documentValues({
    patient: input.patient,
    doctor,
    clinicName: input.context.clinicName,
    city: input.context.site?.city,
    date,
    treatment: text(data.tratamiento),
    extra: {
      horario: text(data.horario) ?? "",
      motivo: text(data.motivo) ?? "",
      acompanante: text(data.acompanante) ?? "",
    },
  });
  printHtml(
    buildDocumentPrintHtml({
      kind: input.templateCode === "ATTENDANCE_CERTIFICATE" ? "certificate" : "consent",
      clinicName: input.context.clinicName,
      ...(input.context.site ? { site: input.context.site } : {}),
      title: input.title,
      body: input.templateBody,
      values,
      date,
      patient: {
        name: `${input.patient.firstName} ${input.patient.lastName}`.trim(),
        dni: input.patient.dni ?? null,
        recordNumber: input.patient.recordNumber ?? null,
      },
      doctor: {
        name: doctor?.displayName ?? "",
        collegiateNumber: doctor?.collegiateNumber ?? null,
      },
      signed: input.signed ?? null,
      ...(input.reference ? { reference: input.reference } : {}),
    }),
  );
}
