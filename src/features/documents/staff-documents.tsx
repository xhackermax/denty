"use client";

import {
  Alert, Badge, Button, FileButton, Group, Select, Stack, Text, TextInput,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import styles from "@/shared/ui/parity.module.css";

type Kind = "CV" | "CONTRACT";
interface StaffFile {
  id: string;
  staffMemberId: string;
  type: Kind;
  title: string;
  fileName: string;
  fileSizeBytes: number;
  checksum: string;
  createdAt: string;
}

async function readResponse(response: Response) {
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const message = payload && typeof payload === "object" && "error" in payload
      ? (payload as { error?: { message?: string } }).error?.message
      : undefined;
    throw new Error(message ?? "No se pudo consultar el archivo de personal.");
  }
  return response;
}

async function loadStaffFiles(kind: Kind): Promise<{ items: StaffFile[] }> {
  const response = await fetch("/api/staff-documents?type=" + kind, {
    credentials: "include", cache: "no-store",
  });
  return (await (await readResponse(response)).json()) as { items: StaffFile[] };
}

export function StaffDocuments({ kind }: { kind: Kind }) {
  const queryClient = useQueryClient();
  const [staffId, setStaffId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const staff = useQuery({
    queryKey: ["staff-documents", "staff", kind],
    queryFn: () => getBrowserApi().admin.sites.overview(),
    staleTime: 0, gcTime: 0,
  });
  const documents = useQuery({
    queryKey: ["staff-documents", "files", kind],
    queryFn: () => loadStaffFiles(kind),
    staleTime: 0, gcTime: 0,
  });
  const team = staff.data?.staff ?? [];
  const grouped = useMemo(() => {
    const map = new Map<string, StaffFile[]>();
    for (const entry of documents.data?.items ?? []) {
      map.set(entry.staffMemberId, [...(map.get(entry.staffMemberId) ?? []), entry]);
    }
    return map;
  }, [documents.data]);
  const upload = useMutation({
    mutationFn: async () => {
      if (!staffId || !file) throw new Error("Selecciona empleado y archivo.");
      const form = new FormData();
      form.set("staffMemberId", staffId);
      form.set("type", kind);
      form.set("title", title.trim() || file.name);
      form.set("file", file);
      const response = await fetch("/api/staff-documents", {
        method: "POST", body: form, credentials: "include",
      });
      await readResponse(response);
    },
    onSuccess: () => {
      setFile(null);
      setTitle("");
      void queryClient.invalidateQueries({ queryKey: ["staff-documents", "files", kind] });
    },
  });

  return (
    <Stack gap="md">
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Añadir {kind === "CV" ? "currículum" : "contrato"}</h3>
        <Text c="dimmed" size="sm" mb="md">
          Archivo privado de la clínica. Solo administración puede consultar y adjuntar documentos.
        </Text>
        <Stack gap="sm">
          <Select
            searchable
            label="Integrante del equipo"
            placeholder="Elegir empleado"
            value={staffId}
            onChange={setStaffId}
            data={team.map((person) => ({
              value: person.id,
              label: person.displayName + (person.active ? "" : " · inactivo"),
            }))}
          />
          <TextInput label="Nombre del documento" placeholder={kind === "CV" ? "CV actualizado" : "Contrato de trabajo"} value={title}
            onChange={(event) => setTitle(event.currentTarget.value)} maxLength={200} />
          <Group>
            <FileButton
              accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx"
              onChange={setFile}
            >
              {(props) => <Button {...props} variant="light">Seleccionar PDF o DOCX</Button>}
            </FileButton>
            <Text size="sm" c="dimmed">{file ? file.name : "Máximo 4 MB"}</Text>
          </Group>
          {file && file.size > 4 * 1024 * 1024 ? (
            <Alert color="orange">El documento supera los 4 MB.</Alert>
          ) : null}
          {upload.isError ? (
            <Alert color="red">{upload.error instanceof Error ? upload.error.message : "No se pudo guardar el archivo."}</Alert>
          ) : null}
          <Group justify="flex-end">
            <Button loading={upload.isPending} disabled={!staffId || !file || file.size > 4 * 1024 * 1024}
              onClick={() => upload.mutate()}>Guardar en expediente</Button>
          </Group>
        </Stack>
      </section>

      {staff.isError || documents.isError ? (
        <Alert color="red">No se pudo cargar el archivo laboral. Comprueba los permisos y la migración de Supabase.</Alert>
      ) : null}
      <section className={styles.section}>
        <Group justify="space-between" mb="md">
          <h3 className={styles.sectionTitle}>{kind === "CV" ? "Currículums del equipo" : "Contratos del equipo"}</h3>
          <Badge variant="light">{documents.data?.items.length ?? 0} archivos</Badge>
        </Group>
        {staff.isPending || documents.isPending ? <Text c="dimmed">Cargando equipo y documentos…</Text> : null}
        <Stack gap="md">
          {team.map((person) => (
            <div key={person.id}>
              <Group justify="space-between" mb="xs">
                <Text fw={700}>{person.displayName}</Text>
                <Group gap="xs">
                  {!person.active ? <Badge color="gray">Inactivo</Badge> : null}
                  <Badge variant="outline">{(grouped.get(person.id) ?? []).length}</Badge>
                </Group>
              </Group>
              <div className={styles.rowList}>
                {(grouped.get(person.id) ?? []).map((entry) => (
                  <div className={styles.row} key={entry.id}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>{entry.title}</span>
                      <span className={styles.rowMeta}>
                        {entry.fileName} · {new Date(entry.createdAt).toLocaleDateString("es-ES")} · {Math.ceil(entry.fileSizeBytes / 1024)} KB
                      </span>
                    </div>
                    <Button component="a" href={"/api/staff-documents?id=" + encodeURIComponent(entry.id)}
                      size="xs" variant="light">Descargar</Button>
                  </div>
                ))}
                {!grouped.get(person.id)?.length ? (
                  <Text size="sm" c="dimmed">Sin {kind === "CV" ? "currículums" : "contratos"} registrados.</Text>
                ) : null}
              </div>
            </div>
          ))}
          {staff.isSuccess && team.length === 0 ? <Text c="dimmed">No hay empleados registrados en la clínica.</Text> : null}
        </Stack>
      </section>
    </Stack>
  );
}
