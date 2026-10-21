"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { dateDMY, todayMadrid } from "@/domain/dates";
import type { Patient } from "@/shared/api";
import { getBrowserApi } from "@/shared/api/browser";
import { isOpenPlanItem } from "@/shared/clinical/treatment-flow-steps";
import { useDocumentContext } from "@/shared/documents/document-context";
import { buildClinicalDocumentHtml } from "@/shared/documents/print-document";
import { persistedEntityToDomain } from "@/shared/odontogram/odontogram-wire";
import { printHtml } from "@/shared/print/print-html";
import { usePrintNotice } from "@/shared/print/print-notice";
import { dentyQueryKeys } from "@/shared/query";

import { buildPatientDossierHtml, type DossierDocument } from "./patient-dossier-html";

interface TemplateRow {
  id: string;
  code?: string;
  body?: string;
}

/** Documents whose printed copy carries the handwritten signature image, as in Documentos. */
const SIGNATURE_IMAGE_CODES = new Set(["DEBT_ACKNOWLEDGEMENT", "DATA_PROTECTION"]);

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la firma."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

/**
 * Prints the patient's dossier. The data is fetched only when asked for (through the same
 * query cache the rest of the record uses), so opening the record stays as light as before.
 */
export function usePatientDossierPrinter(patientId: string) {
  const queryClient = useQueryClient();
  const context = useDocumentContext();
  const notice = usePrintNotice();
  const { run } = notice;
  const [printing, setPrinting] = useState(false);

  const print = useCallback(
    (patient: Patient, medicalAlerts: readonly string[]) =>
      run(async () => {
        setPrinting(true);
        try {
          const api = getBrowserApi();
          const [odontogram, plan, comparisons, budgets, projection, documents, templates] =
            await Promise.all([
              queryClient.fetchQuery({
                queryKey: dentyQueryKeys.clinical.odontogram(patientId),
                queryFn: () => api.clinical.odontogram.get(patientId),
              }),
              queryClient.fetchQuery({
                queryKey: dentyQueryKeys.clinical.plan(patientId),
                queryFn: () => api.clinical.plan.get(patientId),
              }),
              queryClient.fetchQuery({
                queryKey: dentyQueryKeys.clinicalArguments.comparisons(patientId),
                queryFn: () => api.clinicalArguments.comparisons(patientId),
              }),
              queryClient.fetchQuery({
                queryKey: dentyQueryKeys.clinical.budgets(patientId),
                queryFn: () => api.clinical.budgets.listForPatient(patientId),
              }),
              queryClient.fetchQuery({
                queryKey: dentyQueryKeys.patients.projection(patientId),
                queryFn: () => api.portal.projection(patientId),
              }),
              queryClient.fetchQuery({
                queryKey: dentyQueryKeys.documents.patient(patientId),
                queryFn: () => api.documents.list(patientId),
              }),
              queryClient.fetchQuery({
                queryKey: dentyQueryKeys.documents.allTemplateVersions,
                queryFn: () => api.documents.templates.list({ includeInactive: true }),
              }),
            ]);

          const templateById = new Map(
            (templates.items as TemplateRow[]).map((template) => [template.id, template]),
          );
          const dossierDocuments: DossierDocument[] = await Promise.all(
            documents.items.map(async (document) => {
              const template = document.templateId
                ? templateById.get(document.templateId)
                : undefined;
              const base = {
                title: document.title,
                type: document.type,
                status: document.status,
                createdAt: document.createdAt,
                signedAt: document.signedAt,
              };
              if (!template?.body) return { ...base, html: null };
              let signatureImageDataUrl: string | undefined;
              if (template.code && SIGNATURE_IMAGE_CODES.has(template.code) && document.signedAt) {
                // A missing image should not cost the whole dossier: the text still says who signed.
                signatureImageDataUrl = await api.documents
                  .signatureImage(document.id)
                  .then(blobToDataUrl)
                  .catch(() => undefined);
              }
              return {
                ...base,
                html: buildClinicalDocumentHtml({
                  title: document.title,
                  templateCode: template.code,
                  templateBody: template.body,
                  patient,
                  context,
                  data: document.data,
                  signed:
                    document.signedAt && document.signerName
                      ? { signerName: document.signerName, signedAt: document.signedAt }
                      : null,
                  createdAt: document.createdAt,
                  reference: document.id.slice(0, 8),
                  ...(signatureImageDataUrl ? { signatureImageDataUrl } : {}),
                }),
              };
            }),
          );

          await printHtml(
            buildPatientDossierHtml({
              clinicName: context.clinicName,
              date: dateDMY(todayMadrid()),
              patient: {
                name: `${patient.firstName} ${patient.lastName}`.trim(),
                recordNumber: patient.recordNumber,
                dni: patient.dni,
                birthDate: patient.birthDate,
                phone: patient.phone,
                email: patient.email,
              },
              medicalAlerts,
              odontogram: odontogram.entities.map(persistedEntityToDomain),
              planItems: plan.items.filter(isOpenPlanItem),
              comparisons: comparisons.items,
              budgets: budgets.items,
              appointments: projection.appointments,
              documents: dossierDocuments,
            }),
          );
        } finally {
          setPrinting(false);
        }
      }),
    [context, patientId, queryClient, run],
  );

  return { print, printing, notice };
}
