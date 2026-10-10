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
  signatureImageDataUrl?: string | undefined;
  createdAt?: string | undefined;
  reference?: string | undefined;
}): Promise<void> {
  const data = input.data ?? {};
  const doctor =
    input.context.doctorById(text(data.doctorId)) ??
    input.context.doctorById(input.context.defaultDoctorId);
  const debt = input.templateCode === "DEBT_ACKNOWLEDGEMENT";
  const privacy = input.templateCode === "DATA_PROTECTION";
  const frozen = debt || privacy;
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
      ...(frozen ? {
        acreedor: text(data.acreedor) ?? "",
        nif_acreedor: text(data.nif_acreedor) ?? "",
        direccion_fiscal: text(data.direccion_fiscal) ?? "",
        desglose: text(data.desglose) ?? "",
        clinica: text(data.clinica) ?? "",
        sede: text(data.sede) ?? "",
        direccion_sede: text(data.direccion_sede) ?? "",
        ciudad: text(data.ciudad) ?? "",
        paciente: text(data.paciente) ?? "",
        dni: text(data.dni) ?? "",
        doctor: text(data.doctor) ?? "",
        referencia: text(data.referencia) ?? "",
        concepto: text(data.concepto) ?? "",
        importe_deuda: text(data.importe_deuda) ?? "",
        importe_total: text(data.importe_total) ?? "",
        importe_pagado: text(data.importe_pagado) ?? "",
        vencimiento: text(data.vencimiento) ?? "",
      } : {}),
    },
  });
  return printHtml(
    buildDocumentPrintHtml({
      kind: input.templateCode === "ATTENDANCE_CERTIFICATE" ? "certificate" :
        debt ? "debt" : privacy ? "privacy" : "consent",
      clinicName: frozen ? text(data.clinica) ?? input.context.clinicName : input.context.clinicName,
      ...(frozen ? {
        site: {
          name: text(data.sede) ?? input.context.site?.name ?? "",
          address: text(data.direccion_sede) ?? "",
          city: text(data.ciudad) ?? "",
        },
      } : input.context.site ? { site: input.context.site } : {}),
      title: input.title,
      body: input.templateBody,
      values,
      date,
      patient: {
        name: frozen ? text(data.paciente) ?? `${input.patient.firstName} ${input.patient.lastName}`.trim()
          : `${input.patient.firstName} ${input.patient.lastName}`.trim(),
        dni: frozen ? text(data.dni) ?? null : input.patient.dni ?? null,
        recordNumber: input.patient.recordNumber ?? null,
      },
      doctor: {
        name: frozen ? text(data.doctor) ?? "" : doctor?.displayName ?? "",
        collegiateNumber: doctor?.collegiateNumber ?? null,
      },
      signed: input.signed ?? null,
      ...(input.signatureImageDataUrl ? { signatureImageDataUrl: input.signatureImageDataUrl } : {}),
      ...(input.reference ? { reference: input.reference } : {}),
    }),
  );
}
