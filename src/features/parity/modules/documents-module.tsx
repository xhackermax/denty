"use client";

import {
  Alert,
  Badge,
  Button,
  FileButton,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { useConsentRequirementsQuery } from "@/shared/clinical/clinical-data";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";
import { SignaturePad } from "@/shared/ui/signature-pad";

interface SignableDocument {
  id: string;
  patientId: string;
  title: string;
}

interface TemplateRow {
  id: string;
  code?: string;
  title?: string;
}

const SIGNABLE_STATES = new Set(["DRAFT", "FINAL"]);

/** Consent documents open the signature dialog right after creation (Stage 13). */
export function postCreateAction(document: { type: string; status: string }): "sign" | "none" {
  return document.type === "CONSENT" && SIGNABLE_STATES.has(document.status) ? "sign" : "none";
}

export function DocumentsModule() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get("patientId");
  const consentWorkflow = searchParams.get("workflow") === "consents";

  const patients = usePatientsQuery();
  const documents = useQuery({
    queryKey: dentyQueryKeys.documents.all,
    queryFn: () => getBrowserApi().documents.list(),
  });
  const templates = useQuery({
    queryKey: dentyQueryKeys.documents.templates,
    queryFn: () => getBrowserApi().documents.templates.list(),
  });

  const [patientId, setPatientId] = useState<string | null>(initialPatientId);
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [signing, setSigning] = useState<SignableDocument | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  const consents = useConsentRequirementsQuery(patientId ?? "", Boolean(patientId));

  const invalidateClinical = (targetPatientId: string) => {
    void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.documents.root });
    void queryClient.invalidateQueries({
      queryKey: dentyQueryKeys.clinical.consents(targetPatientId),
    });
    void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.clinical.sync(targetPatientId) });
  };

  const patientName = (id: string) => {
    const patient = (patients.data?.items ?? []).find((item) => item.id === id);
    return patient ? `${patient.firstName} ${patient.lastName}` : "";
  };

  const openSigning = (document: SignableDocument) => {
    setSigning(document);
    setSignerName(patientName(document.patientId));
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
    mutationFn: ({ id, name, dataUrl }: { id: string; name: string; dataUrl: string }) =>
      getBrowserApi().documents.sign(id, { signerName: name, signatureDataUrl: dataUrl }),
    onSuccess: (document) => {
      invalidateClinical(document.patientId);
      setSigning(null);
    },
  });

  const downloadFile = async (id: string, fileName?: string | null) => {
    const blob = await getBrowserApi().documents.download(id);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName || "documento";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const templateRows = (templates.data?.items ?? []) as TemplateRow[];
  const templateById = new Map(templateRows.map((template) => [template.id, template]));
  const hasError = patients.isError || documents.isError || templates.isError;
  const visibleDocuments = (documents.data?.items ?? []).filter(
    (document) => !patientId || document.patientId === patientId,
  );
  const pendingConsents = (consents.data?.items ?? []).filter(
    (item) => item.status !== "SATISFIED",
  );

  const createConsent = (requirementTemplateId: string | null | undefined, code: string) => {
    if (!patientId) return;
    const template = requirementTemplateId ? templateById.get(requirementTemplateId) : undefined;
    create.mutate({
      patientId,
      type: "CONSENT",
      title: template?.title ?? code,
      ...(requirementTemplateId ? { templateId: requirementTemplateId } : {}),
    });
  };

  return (
    <Stack gap="md">
      {hasError ? <Alert color="red">No se pudieron cargar todos los documentos.</Alert> : null}

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
                  <span className={styles.rowMeta}>{requirement.consentCode}</span>
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
                      onClick={() => createConsent(requirement.templateId, requirement.consentCode)}
                    >
                      Crear y firmar
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <Group justify="space-between">
          <div>
            <h3 className={styles.sectionTitle}>Nuevo documento</h3>
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
            data={templateRows.map((template, index) => ({
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
            disabled={!patientId || !title.trim()}
            loading={create.isPending}
            onClick={() => {
              if (!patientId) return;
              const code = templateId ? templateById.get(templateId)?.code : undefined;
              create.mutate(
                {
                  patientId,
                  type: code?.startsWith("CONSENT_") ? "CONSENT" : "CLINICAL_DOCUMENT",
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
        <h3 className={styles.sectionTitle}>Documentos</h3>
        <div className={styles.rowList}>
          {visibleDocuments.map((document) => (
            <div className={styles.row} key={document.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{document.title}</span>
                <span className={styles.rowMeta}>
                  {document.type} · {new Date(document.createdAt).toLocaleDateString("es-ES")} ·{" "}
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
                <Badge {...(document.status === "SIGNED" ? { color: "green" } : {})}>
                  {document.status}
                </Badge>
                <Badge variant="light">v{document.version}</Badge>
                {document.checksum ? <Badge variant="outline">SHA-256</Badge> : null}
                {SIGNABLE_STATES.has(document.status) ? (
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
                {document.status === "DRAFT" ? (
                  <Button size="xs" variant="light" onClick={() => finalize.mutate(document.id)}>
                    Finalizar
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {!documents.isLoading && visibleDocuments.length === 0 ? (
            <Text c="dimmed">Sin documentos.</Text>
          ) : null}
        </div>
      </section>

      <Modal
        opened={signing !== null}
        onClose={() => setSigning(null)}
        title={signing ? `Firmar: ${signing.title}` : "Firmar documento"}
        centered
      >
        <Stack>
          <TextInput
            label="Nombre de quien firma"
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
              sign.mutate({ id: signing.id, name: signerName.trim(), dataUrl: signature })
            }
          >
            Guardar firma
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
