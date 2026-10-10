"use client";

import {
  Alert,
  Badge,
  Button,
  Checkbox,
  FileButton,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { todayMadrid } from "@/domain/dates";
import { getBrowserApi } from "@/shared/api/browser";
import {
  useClinicalPlanQuery,
  useConsentRequirementsQuery,
  usePatientBudgetsQuery,
} from "@/shared/clinical/clinical-data";
import { documentValues, useDocumentContext } from "@/shared/documents/document-context";
import { printClinicalDocument } from "@/shared/documents/print-document";
import { PrintNotice, usePrintNotice } from "@/shared/print/print-notice";
import { TemplateText } from "@/shared/documents/template-text";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";
import { SignaturePad } from "@/shared/ui/signature-pad";

interface SignableDocument {
  /** Missing when the document is created only once it is signed. */
  id?: string;
  patientId: string;
  title: string;
  templateId?: string | null | undefined;
  data?: Record<string, unknown> | undefined;
}

interface TemplateRow {
  id: string;
  code?: string;
  title?: string;
  body?: string;
  active?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  BUDGET: "Presupuesto",
  CONSENT: "Consentimiento",
  CERTIFICATE: "Justificante",
  CLINICAL_DOCUMENT: "Documento clínico",
  DEBT_ACKNOWLEDGEMENT: "Reconocimiento de deuda",
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  FINAL: "Final",
  FINALIZED: "Final",
  SIGNED: "Firmado",
  DELIVERED: "Entregado",
  ARCHIVED: "Archivado",
};

/** Sentences of the attendance certificate, saved with the document to reprint it. */
export function certificateData(input: {
  date: string;
  from: string;
  to: string;
  reason: string | null;
  companionName: string;
  companionDni: string;
  doctorId: string | null;
}): Record<string, string | null> {
  const horario =
    input.from && input.to
      ? `, desde las ${input.from} hasta las ${input.to} horas`
      : input.from
        ? `, a las ${input.from} horas`
        : "";
  const companion = input.companionName.trim();
  return {
    fecha: input.date,
    horario,
    motivo: input.reason?.trim() ? `, para ${input.reason.trim()}` : "",
    acompanante: companion
      ? ` Asimismo, D./Dña. ${companion}${input.companionDni.trim() ? `, con DNI/NIE ${input.companionDni.trim()},` : ""} ha acudido en calidad de acompañante.`
      : "",
    doctorId: input.doctorId,
  };
}

const SIGNABLE_STATES = new Set(["DRAFT", "FINAL"]);

/** Consent documents open the signature dialog right after creation (Stage 13). */
export function postCreateAction(document: { type: string; status: string }): "sign" | "none" {
  return document.type === "CONSENT" && SIGNABLE_STATES.has(document.status) ? "sign" : "none";
}

export function DocumentsModule({ mode = "archive" }: { mode?: "archive" | "consents" }) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get("patientId");
  const consentWorkflow = searchParams.get("workflow") === "consents";
  const [patientId, setPatientId] = useState<string | null>(initialPatientId);

  const patients = usePatientsQuery();
  const documents = useQuery({
    queryKey: patientId
      ? dentyQueryKeys.documents.patient(patientId)
      : dentyQueryKeys.documents.all,
    queryFn: () => getBrowserApi().documents.list(patientId ?? undefined),
    staleTime: 30_000,
  });
  const templates = useQuery({
    queryKey: dentyQueryKeys.documents.allTemplateVersions,
    queryFn: () => getBrowserApi().documents.templates.list({ includeInactive: true }),
    staleTime: 60_000,
  });

  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [signing, setSigning] = useState<SignableDocument | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [doctorChoice, setDoctorChoice] = useState<string | null>(null);
  // Attendance certificate.
  const [certDate, setCertDate] = useState(todayMadrid());
  const [certFrom, setCertFrom] = useState("");
  const [certTo, setCertTo] = useState("");
  const [certWithReason, setCertWithReason] = useState(false);
  const [certReason, setCertReason] = useState("recibir tratamiento odontológico");
  const [companionName, setCompanionName] = useState("");
  const [companionDni, setCompanionDni] = useState("");
  // Reconocimiento de deuda. The amount is computed from the budget ledger if selected.
  const [debtBudgetId, setDebtBudgetId] = useState<string | null>(null);
  const [debtAmount, setDebtAmount] = useState("");
  const [debtConcept, setDebtConcept] = useState("Tratamiento odontológico realizado o presupuestado");
  const [debtDueMode, setDebtDueMode] = useState<"END_OF_TREATMENT" | "FIXED_DATE">("END_OF_TREATMENT");
  const [debtDueDate, setDebtDueDate] = useState("");


  const context = useDocumentContext();
  const printNotice = usePrintNotice();
  const doctorId = doctorChoice ?? context.defaultDoctorId;
  const consents = useConsentRequirementsQuery(patientId ?? "", Boolean(patientId));
  const plan = useClinicalPlanQuery(patientId ?? "", Boolean(patientId));
  const patientBudgets = usePatientBudgetsQuery(patientId ?? "", Boolean(patientId));
  const signedBudgets = (patientBudgets.data?.items ?? []).filter(
    budget => budget.status === "SIGNED" && budget.totalCents > 0,
  );
  const selectedDebtBudget = signedBudgets.find(b => b.id === debtBudgetId);
  const debtAmountCents = (() => {
    const entered = debtAmount.trim().replace(",", ".");
    if (!/^\\d{1,7}(?:\\.\\d{1,2})?$/.test(entered)) return null;
    const [euros = "0", cents = ""] = entered.split(".");
    const value = Number(euros) * 100 + Number(cents.padEnd(2, "0"));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  })();
  const signedBudgetIds = new Set(
    (patientBudgets.data?.items ?? [])
      .filter((budget) => budget.status === "SIGNED")
      .map((budget) => budget.id),
  );

  const invalidateClinical = (targetPatientId: string) => {
    void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.documents.root });
    void queryClient.invalidateQueries({
      queryKey: dentyQueryKeys.clinical.consents(targetPatientId),
    });
    void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.clinical.sync(targetPatientId) });
  };

  const patientById = useMemo(
    () => new Map((patients.data?.items ?? []).map((patient) => [patient.id, patient])),
    [patients.data],
  );
  const patientName = (id: string) => {
    const patient = patientById.get(id);
    return patient ? `${patient.firstName} ${patient.lastName}` : "";
  };

  const openSigning = (document: SignableDocument) => {
    setSigning(document);
    setSignerName(typeof document.data?.paciente === "string" ?
      document.data.paciente : patientName(document.patientId));
    setSignature(null);
  };

  const create = useMutation({
    mutationFn: (payload: {
      patientId: string;
      type: string;
      title: string;
      templateId?: string;
    }) => getBrowserApi().documents.create({ ...payload, data: {} }),
    onSuccess: (document) => {
      invalidateClinical(document.patientId);
      if (postCreateAction(document) === "sign") openSigning(document);
    },
  });
  const finalize = useMutation({
    mutationFn: (id: string) => getBrowserApi().documents.finalize(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.documents.root }),
  });
  const uploadFile = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      getBrowserApi().documents.uploadFile(id, file),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.documents.root }),
  });
  const sign = useMutation({
    mutationFn: async ({
      target,
      name,
      dataUrl,
    }: {
      target: SignableDocument;
      name: string;
      dataUrl: string;
    }) => {
      const api = getBrowserApi();
      // Consents are created when signed, so an unsigned copy never lingers.
      const id =
        target.id ??
        (
          await api.documents.create({
            patientId: target.patientId,
            type: "CONSENT",
            title: target.title,
            ...(target.templateId ? { templateId: target.templateId } : {}),
            data: Object.fromEntries(
              Object.entries(target.data ?? {}).map(([key, value]) => [
                key,
                typeof value === "string" || typeof value === "number" ? value : null,
              ]),
            ),
          })
        ).id;
      return api.documents.sign(id, { signerName: name, signatureDataUrl: dataUrl });
    },
    onSuccess: (document) => {
      invalidateClinical(document.patientId);
      setSigning(null);
    },
  });
  const certificate = useMutation({
    mutationFn: async () => {
      const template = templateRows.find(
        (row) => row.code === "ATTENDANCE_CERTIFICATE" && row.active !== false,
      );
      if (!patientId || !template) throw new Error("Falta el paciente o la plantilla.");
      const data = certificateData({
        date: certDate,
        from: certFrom,
        to: certTo,
        reason: certWithReason ? certReason : null,
        companionName,
        companionDni,
        doctorId,
      });
      const document = await getBrowserApi().documents.create({
        patientId,
        type: "CERTIFICATE",
        title: `Justificante de asistencia · ${certDate.split("-").reverse().join("/")}`,
        templateId: template.id,
        data,
      });
      return { document, template, data };
    },
    onSuccess: ({ document, template, data }) => {
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.documents.root });
      printDocument({ ...document, data }, template);
      setCompanionName("");
      setCompanionDni("");
    },
  });

  const createDebt = useMutation({
    mutationFn: async () => {
      if (!patientId || !context.site?.id || !doctorId)
        throw new Error("Selecciona paciente, sede y profesional.");
      if (debtDueMode === "FIXED_DATE" && !debtDueDate)
        throw new Error("Indica la fecha límite de pago.");
      if (!debtBudgetId && !debtAmountCents)
        throw new Error("Introduce el saldo pendiente en euros o elige un presupuesto firmado.");
      return getBrowserApi().documents.debtAcknowledgement({
        patientId,
        siteId: context.site.id,
        doctorId,
        ...(debtBudgetId ? { budgetId: debtBudgetId } : { amountCents: debtAmountCents! }),
        concept: debtConcept.trim(),
        dueMode: debtDueMode,
        ...(debtDueMode === "FIXED_DATE" ? { dueDate: debtDueDate } : {}),
      });
    },
    onSuccess: document => {
      invalidateClinical(document.patientId);
      openSigning(document);
    },
  });

  const downloadFile = async (id: string, fileName?: string | null) => {
    try {
      const blob = await getBrowserApi().documents.download(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName || "documento";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      printNotice.fail("No se pudo descargar el archivo.");
    }
  };

  const templateRows = (templates.data?.items ?? []) as TemplateRow[];
  const templateById = new Map(templateRows.map((template) => [template.id, template]));
  const activeTemplates = templateRows.filter(
    (template) =>
      template.active !== false &&
      template.code !== "ATTENDANCE_CERTIFICATE" &&
      template.code !== "DEBT_ACKNOWLEDGEMENT" &&
      (mode !== "consents" || template.code?.startsWith("CONSENT_")),
  );
  const planItems = plan.data?.items ?? [];
  const treatmentFor = (planItemId: string | null | undefined) => {
    const item = planItems.find((entry) => entry.id === planItemId);
    return item ? `${item.label}${item.tooth ? ` · diente ${item.tooth}` : ""}` : null;
  };
  const printDocument = (
    document: {
      id?: string | undefined;
      patientId: string;
      title: string;
      createdAt?: string | undefined;
      signerName?: string | null | undefined;
      signedAt?: string | null | undefined;
      data?: Record<string, unknown> | undefined;
    },
    template: TemplateRow | undefined,
  ) =>
    printNotice.run(async () => {
      const patient = patientById.get(document.patientId);
      if (!patient) throw new Error("No se encontró al paciente de este documento.");
      if (!template?.body) throw new Error("Este documento no tiene una plantilla imprimible.");
      let signatureImageDataUrl: string | undefined;
      if (template.code === "DEBT_ACKNOWLEDGEMENT" && document.signedAt && document.id) {
        const image = await getBrowserApi().documents.signatureImage(document.id);
        signatureImageDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("No se pudo preparar la firma original."));
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(image);
        });
      }
      await printClinicalDocument({
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
        reference: document.id?.slice(0, 8),
        ...(signatureImageDataUrl ? { signatureImageDataUrl } : {}),
      });
    });
  const signingTemplate = signing?.templateId ? templateById.get(signing.templateId) : undefined;
  const signingPatient = signing ? patientById.get(signing.patientId) : undefined;
  const signingDoctorId =
    typeof signing?.data?.doctorId === "string" ? signing.data.doctorId : doctorId;
  const hasError = patients.isError || documents.isError || templates.isError;
  const visibleDocuments = (documents.data?.items ?? []).filter(
    (document) => mode !== "consents" || document.type === "CONSENT" || document.type === "DEBT_ACKNOWLEDGEMENT",
  );
  const pendingConsents = (consents.data?.items ?? []).filter(
    (item) => item.status !== "SATISFIED",
  );

  const createConsent = (
    requirementTemplateId: string | null | undefined,
    code: string,
    planItemId?: string | null,
  ) => {
    if (!patientId) return;
    const template = requirementTemplateId ? templateById.get(requirementTemplateId) : undefined;
    openSigning({
      patientId,
      title: template?.title ?? code,
      templateId: requirementTemplateId,
      data: { doctorId, tratamiento: treatmentFor(planItemId) },
    });
  };

  return (
    <Stack gap="md">
      {hasError ? <Alert color="red">No se pudieron cargar todos los documentos.</Alert> : null}
      <PrintNotice error={printNotice.error} onClose={printNotice.clear} />
      {create.isError ? <Alert color="red">No se pudo crear el documento.</Alert> : null}
      {finalize.isError ? <Alert color="red">No se pudo finalizar el documento.</Alert> : null}
      {uploadFile.isError ? <Alert color="red">No se pudo adjuntar el archivo.</Alert> : null}

      {patientId ? (
        <section className={styles.section} aria-label="Consentimientos del plan">
          <Group justify="space-between">
            <div>
              <h3 className={styles.sectionTitle}>Consentimientos del plan</h3>
              <p className={styles.sectionDescription}>
                El presupuesto solo se puede firmar cuando todos están firmados.
              </p>
            </div>
            <Badge color={pendingConsents.length ? "orange" : "green"} variant="light">
              {pendingConsents.length ? `${pendingConsents.length} pendientes` : "Completos"}
            </Badge>
          </Group>
          {consentWorkflow && !consents.isLoading && (consents.data?.items.length ?? 0) === 0 ? (
            <Text c="dimmed" mt="sm">
              El plan de este paciente no requiere consentimientos.
            </Text>
          ) : null}
          <div className={styles.rowList}>
            {(consents.data?.items ?? []).map((requirement) => (
              <div className={styles.row} key={requirement.id}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>
                    {(requirement.templateId && templateById.get(requirement.templateId)?.title) ||
                      requirement.consentCode}
                  </span>
                  <span className={styles.rowMeta}>
                    {treatmentFor(requirement.clinicalPlanItemId) ?? "Plan de tratamiento"}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Badge color={requirement.status === "SATISFIED" ? "green" : "orange"}>
                    {requirement.status === "SATISFIED" ? "Firmado" : "Pendiente"}
                  </Badge>
                  {requirement.status !== "SATISFIED" ? (
                    <Button
                      size="xs"
                      loading={create.isPending}
                      disabled={!requirement.templateId}
                      onClick={() =>
                        createConsent(
                          requirement.templateId,
                          requirement.consentCode,
                          requirement.clinicalPlanItemId,
                        )
                      }
                    >
                      Leer y firmar
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {patientId && mode !== "consents" ? (
        <section className={styles.section} aria-label="Justificante de asistencia">
          <Group justify="space-between">
            <div>
              <h3 className={styles.sectionTitle}>Justificante de asistencia</h3>
              <p className={styles.sectionDescription}>
                Para el trabajo o el centro de estudios del paciente o de su acompañante.
              </p>
            </div>
            <Badge variant="light">{patientName(patientId)}</Badge>
          </Group>
          <Stack mt="md" gap="sm">
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <TextInput
                type="date"
                label="Fecha"
                value={certDate}
                onChange={(event) => setCertDate(event.currentTarget.value)}
              />
              <TextInput
                type="time"
                label="Desde"
                value={certFrom}
                onChange={(event) => setCertFrom(event.currentTarget.value)}
              />
              <TextInput
                type="time"
                label="Hasta"
                value={certTo}
                onChange={(event) => setCertTo(event.currentTarget.value)}
              />
            </SimpleGrid>
            <Checkbox
              label="Indicar el motivo de la visita"
              checked={certWithReason}
              onChange={(event) => setCertWithReason(event.currentTarget.checked)}
            />
            {certWithReason ? (
              <TextInput
                label="Motivo"
                value={certReason}
                onChange={(event) => setCertReason(event.currentTarget.value)}
              />
            ) : null}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label="Acompañante (opcional)"
                placeholder="Nombre y apellidos"
                value={companionName}
                onChange={(event) => setCompanionName(event.currentTarget.value)}
              />
              <TextInput
                label="DNI/NIE del acompañante"
                value={companionDni}
                onChange={(event) => setCompanionDni(event.currentTarget.value)}
              />
            </SimpleGrid>
            <Select
              label="Profesional que lo firma"
              value={doctorId}
              onChange={setDoctorChoice}
              data={context.doctors.map((doctor) => ({
                value: doctor.id,
                label: doctor.displayName,
              }))}
            />
            {certificate.isError ? (
              <Alert color="red">
                {certificate.error instanceof Error
                  ? certificate.error.message
                  : "No se pudo crear el justificante."}
              </Alert>
            ) : null}
            <Group justify="flex-end">
              <Button
                leftSection={<IconPrinter size={16} />}
                loading={certificate.isPending}
                disabled={!certDate}
                onClick={() => certificate.mutate()}
              >
                Crear e imprimir
              </Button>
            </Group>
          </Stack>
        </section>
      ) : null}

      {patientId ? (
        <section className={styles.section} aria-label="Reconocimiento de deuda">
          <Group justify="space-between" mb="sm">
            <div>
              <h3 className={styles.sectionTitle}>Reconocimiento de deuda</h3>
              <p className={styles.sectionDescription}>
                Para un pago aplazado hasta terminar el tratamiento o una fecha pactada.
                La firma no sustituye el presupuesto ni la factura.
              </p>
            </div>
            <Badge variant="light">Firmable</Badge>
          </Group>
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              Paciente: {patientName(patientId)} · DNI/NIE: {patientById.get(patientId)?.dni ?? "Pendiente"}
            </Text>
            <Text size="sm" c="dimmed">
              Sede: {context.site?.name ?? "Selecciona una sede activa"}.
              El saldo se calcula en el servidor al generar el documento.
            </Text>
            <Select label="Doctor responsable" data={context.doctors.map(doctor => ({
              value: doctor.id, label: doctor.displayName,
            }))} value={doctorId} onChange={setDoctorChoice} searchable/>
            <Select label="Presupuesto firmado (opcional)" clearable searchable
              placeholder="Sin presupuesto: especificar saldo manualmente"
              value={debtBudgetId} onChange={setDebtBudgetId}
              data={signedBudgets.map(budget => ({
                value: budget.id,
                label: `${budget.code} · ${(budget.totalCents / 100).toFixed(2)} € (importe total)`,
              }))}
            />
            {selectedDebtBudget ? (
              <Alert color="blue">
                Presupuesto: {(selectedDebtBudget.totalCents / 100).toFixed(2)} €.
                El saldo exacto descontará los pagos contabilizados antes de la firma.
              </Alert>
            ) : (
              <TextInput label="Importe pendiente verificado (€)" inputMode="decimal"
                placeholder="Ej.: 350,00" value={debtAmount} onChange={event => setDebtAmount(event.currentTarget.value)}
                description="Comprueba el importe y los pagos recibidos antes de solicitar la firma."
              />
            )}
            <TextInput label="Origen o concepto de la deuda" required maxLength={500}
              value={debtConcept} onChange={event => setDebtConcept(event.currentTarget.value)} />
            <Select label="Cuándo se pagará" value={debtDueMode}
              onChange={value => setDebtDueMode(value === "FIXED_DATE" ? "FIXED_DATE" : "END_OF_TREATMENT")}
              data={[
                {value:"END_OF_TREATMENT", label:"Al finalizar el tratamiento"},
                {value:"FIXED_DATE", label:"En una fecha concreta"},
              ]} />
            {debtDueMode === "FIXED_DATE" ? (
              <TextInput label="Fecha límite de pago" type="date" value={debtDueDate}
                min={todayMadrid()} onChange={event => setDebtDueDate(event.currentTarget.value)} />
            ) : null}
            {createDebt.isError ? (
              <Alert color="red">{createDebt.error instanceof Error ? createDebt.error.message
                : "No se pudo generar el reconocimiento de deuda."}</Alert>
            ) : null}
            <Group justify="flex-end">
              <Button loading={createDebt.isPending}
                disabled={!patientById.get(patientId)?.dni || !context.site?.id || !doctorId ||
                  debtConcept.trim().length < 5 || (!debtBudgetId && !debtAmountCents) ||
                  (debtDueMode === "FIXED_DATE" && !debtDueDate)}
                onClick={() => createDebt.mutate()}>
                Generar, revisar y firmar
              </Button>
            </Group>
          </Stack>
        </section>
      ) : null}

      <section className={styles.section}>
        <Group justify="space-between">
          <div>
            <h3 className={styles.sectionTitle}>{mode === "consents" ? "Nuevo consentimiento" : "Nuevo documento"}</h3>
            <p className={styles.sectionDescription}>Se crea directamente en la fuente canónica.</p>
          </div>
          <Badge variant="light">Servidor</Badge>
        </Group>
        <Stack mt="md">
          <Select
            searchable
            clearable
            label="Paciente"
            value={patientId}
            onChange={setPatientId}
            data={(patients.data?.items ?? []).map((patient) => ({
              value: patient.id,
              label: `${patient.firstName} ${patient.lastName}`,
            }))}
          />
          <Select
            clearable
            label="Plantilla"
            value={templateId}
            onChange={(value) => {
              setTemplateId(value);
              const template = value ? templateById.get(value) : undefined;
              if (template?.title && !title.trim()) setTitle(template.title);
            }}
            data={activeTemplates.map((template, index) => ({
              value: template.id,
              label: template.title ?? `Plantilla ${index + 1}`,
            }))}
          />
          <TextInput
            label="Título"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
          <Button
            disabled={!patientId || !title.trim() || (mode === "consents" && !templateId)}
            loading={create.isPending}
            onClick={() => {
              if (!patientId) return;
              const code = templateId ? templateById.get(templateId)?.code : undefined;
              create.mutate(
                {
                  patientId,
                  type: mode === "consents" || code?.startsWith("CONSENT_")
                     ? "CONSENT" : "CLINICAL_DOCUMENT",
                  title: title.trim(),
                  ...(templateId ? { templateId } : {}),
                },
                { onSuccess: () => setTitle("") },
              );
            }}
          >
            Crear
          </Button>
        </Stack>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          {mode === "consents" ? "Consentimientos y reconocimientos de deuda" : "Documentos"}
        </h3>
        <div className={styles.rowList}>
          {visibleDocuments.map((document) => {
            const pendingBudget =
              document.type === "BUDGET" && document.data?.decision === "PENDING_SIGNATURE";
            const budgetId =
              typeof document.data?.budgetId === "string" ? document.data.budgetId : null;
            const budgetSigned = Boolean(budgetId && signedBudgetIds.has(budgetId));
            return (
            <div className={styles.row} key={document.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  {pendingBudget && budgetSigned
                    ? `Presupuesto ${document.data?.budgetCode ?? ""} · firmado`
                    : document.title}
                </span>
                <span className={styles.rowMeta}>
                  {TYPE_LABELS[document.type] ?? document.type} ·{" "}
                  {new Date(document.createdAt).toLocaleDateString("es-ES")} ·{" "}
                  {document.fileSizeBytes
                    ? `${Math.ceil(document.fileSizeBytes / 1024)} KB`
                    : "sin archivo"}
                  {document.signedAt
                    ? ` · firmado por ${document.signerName ?? "paciente"} el ${new Date(
                        document.signedAt,
                      ).toLocaleDateString("es-ES")}`
                    : ""}
                </span>
              </div>
              <div className={styles.rowActions}>
                <Badge
                  {...(document.status === "SIGNED" || budgetSigned
                    ? { color: "green" }
                    : pendingBudget ? { color: "orange" } : {})}
                >
                  {budgetSigned
                    ? "Firmado"
                    : pendingBudget && document.status === "DRAFT"
                      ? "Pendiente de firma"
                      : (STATUS_LABELS[document.status] ?? document.status)}
                </Badge>
                <Badge variant="light">v{document.version}</Badge>
                {document.checksum ? <Badge variant="outline">SHA-256</Badge> : null}
                {document.templateId && templateById.get(document.templateId)?.body ? (
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPrinter size={14} />}
                    onClick={() =>
                      printDocument(
                        document,
                        document.templateId ? templateById.get(document.templateId) : undefined,
                      )
                    }
                  >
                    Imprimir
                  </Button>
                ) : null}
                {pendingBudget && budgetId ? (
                  <Button
                    component={Link}
                    href={
                      budgetSigned
                        ? `/app/patients/${encodeURIComponent(document.patientId)}?view=budgets`
                        : `/app/patients/${encodeURIComponent(document.patientId)}?view=budgets&action=sign&budgetId=${encodeURIComponent(budgetId)}`
                    }
                    size="xs"
                    color="teal"
                  >
                    {budgetSigned ? "Ver presupuesto firmado" : "Continuar firma"}
                  </Button>
                ) : pendingBudget ? null : SIGNABLE_STATES.has(document.status) ? (
                  <Button size="xs" onClick={() => openSigning(document)}>
                    Firmar
                  </Button>
                ) : null}
                <FileButton
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(file) => file && uploadFile.mutate({ id: document.id, file })}
                >
                  {(props) => (
                    <Button {...props} size="xs" variant="light">
                      {document.fileName ? "Nueva versión" : "Adjuntar archivo"}
                    </Button>
                  )}
                </FileButton>
                {document.fileName ? (
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => void downloadFile(document.id, document.fileName)}
                  >
                    Descargar
                  </Button>
                ) : null}
                {document.status === "DRAFT" && document.type !== "BUDGET" ? (
                  <Button size="xs" variant="light" onClick={() => finalize.mutate(document.id)}>
                    Finalizar
                  </Button>
                ) : null}
              </div>
            </div>
            );
          })}
          {!documents.isLoading && visibleDocuments.length === 0 ? (
            <Text c="dimmed">Sin {mode === "consents" ? "consentimientos" : "documentos"}.</Text>
          ) : null}
        </div>
      </section>

      <Modal
        opened={signing !== null}
        onClose={() => setSigning(null)}
        title={signing ? `Firmar: ${signing.title}` : "Firmar documento"}
        centered
        size="lg"
      >
        <Stack>
          {signing && signingTemplate?.body ? (
            <>
              <Select
                label="Profesional responsable"
                value={signingDoctorId}
                disabled={signing.data?.documentKind === "DEBT_ACKNOWLEDGEMENT"}
                onChange={(value) =>
                  setSigning({ ...signing, data: { ...signing.data, doctorId: value } })
                }
                data={context.doctors.map((doctor) => ({
                  value: doctor.id,
                  label: doctor.displayName,
                }))}
              />
              <div className={styles.consentText}>
                <TemplateText
                  body={signingTemplate.body}
                  values={documentValues({
                    patient: signingPatient ?? null,
                    doctor: context.doctorById(signingDoctorId),
                    clinicName: context.clinicName,
                    city: context.site?.city,
                    date: typeof signing.data?.fecha === "string" ? signing.data.fecha : todayMadrid(),
                    treatment:
                      typeof signing.data?.tratamiento === "string"
                        ? signing.data.tratamiento
                        : null,
                    extra: Object.fromEntries(
                      Object.entries(signing.data ?? {})
                        .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
                    ),
                  })}
                />
              </div>
              <Group justify="flex-end">
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconPrinter size={14} />}
                  onClick={() => printDocument(signing, signingTemplate)}
                >
                  Imprimir para leer
                </Button>
              </Group>
            </>
          ) : null}
          <TextInput
            label="Nombre de quien firma"
            disabled={signing?.data?.documentKind === "DEBT_ACKNOWLEDGEMENT"}
            value={signerName}
            onChange={(event) => setSignerName(event.currentTarget.value)}
          />
          <SignaturePad onChange={setSignature} />
          {sign.isError ? (
            <Alert color="red">
              {sign.error instanceof Error ? sign.error.message : "No se pudo firmar."}
            </Alert>
          ) : null}
          <Button
            disabled={!signing || !signature || signerName.trim().length < 2}
            loading={sign.isPending}
            onClick={() =>
              signing &&
              signature &&
              sign.mutate({ target: signing, name: signerName.trim(), dataUrl: signature })
            }
          >
            Guardar firma
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
