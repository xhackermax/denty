"use client";

import { useCallback } from "react";

import { dateDMY } from "@/domain/dates";
import type { TreatmentComparisonRecord } from "@/shared/api/schemas/clinical-arguments";
import { useDocumentContext } from "@/shared/documents/document-context";
import { buildTreatmentComparisonPrintHtml } from "@/shared/documents/treatment-comparison-print";
import { usePatientQuery } from "@/shared/patients/patient-data";
import { printHtml } from "@/shared/print/print-html";
import { usePrintNotice } from "@/shared/print/print-notice";

/** Prints a saved comparison for the patient, dated the day it was saved. */
export function useComparisonPrinter(patientId: string) {
  const context = useDocumentContext();
  const patient = usePatientQuery(patientId).data;
  const notice = usePrintNotice();
  const { run } = notice;
  const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : "";
  const print = useCallback(
    (record: TreatmentComparisonRecord) =>
      run(() =>
        printHtml(
          buildTreatmentComparisonPrintHtml(record, {
            clinicName: context.clinicName,
            patientName,
            recordNumber: patient?.recordNumber ?? null,
            date: dateDMY(record.createdAt),
          }),
        ),
      ),
    [context.clinicName, patient?.recordNumber, patientName, run],
  );
  return { print, notice };
}
