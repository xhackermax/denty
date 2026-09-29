"use client";

import {
  Alert,
  Badge,
  Button,
  FileButton,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

export function DocumentsModule() {
  const queryClient = useQueryClient();
  const patients = usePatientsQuery();
  const documents = useQuery({
    queryKey: dentyQueryKeys.documents.all,
    queryFn: () => getBrowserApi().documents.list(),
  });
  const templates = useQuery({
    queryKey: dentyQueryKeys.documents.templates,
    queryFn: () => getBrowserApi().documents.templates.list(),
  });
  const create = useMutation({
    mutationFn: (payload: {
      patientId: string;
      type: string;
      title: string;
      templateId?: string;
    }) => getBrowserApi().documents.create({ ...payload, data: {} }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.documents.root }),
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

  const downloadFile = async (id: string, fileName?: string | null) => {
    const blob = await getBrowserApi().documents.download(id);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName || "documento";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const [patientId, setPatientId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const hasError = patients.isError || documents.isError || templates.isError;

  return (
    <Stack gap="md">
      {hasError ? <Alert color="red">No se pudieron cargar todos los documentos.</Alert> : null}

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
            onChange={setTemplateId}
            data={(templates.data?.items ?? []).map((template, index) => {
              const row = template as Record<string, unknown>;
              return {
                value: template.id,
                label: typeof row.title === "string" ? row.title : `Plantilla ${index + 1}`,
              };
            })}
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
              create.mutate(
                {
                  patientId,
                  type: "CLINICAL_DOCUMENT",
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
          {(documents.data?.items ?? []).map((document) => (
            <div className={styles.row} key={document.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{document.title}</span>
                <span className={styles.rowMeta}>
                  {document.type} · {new Date(document.createdAt).toLocaleDateString("es-ES")} ·{" "}
                  {document.fileSizeBytes
                    ? `${Math.ceil(document.fileSizeBytes / 1024)} KB`
                    : "sin archivo"}
                </span>
              </div>
              <div className={styles.rowActions}>
                <Badge>{document.status}</Badge>
                <Badge variant="light">v{document.version}</Badge>
                {document.checksum ? <Badge variant="outline">SHA-256</Badge> : null}
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
                {document.status !== "FINAL" && document.status !== "SIGNED" ? (
                  <Button size="xs" variant="light" onClick={() => finalize.mutate(document.id)}>
                    Finalizar
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {!documents.isLoading && (documents.data?.items.length ?? 0) === 0 ? (
            <Text c="dimmed">Sin documentos.</Text>
          ) : null}
        </div>
      </section>
    </Stack>
  );
}
