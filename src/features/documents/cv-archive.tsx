"use client";

import {
  Alert, Badge, Button, FileButton, Group, Modal, Stack, Text, Textarea, TextInput,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconFileTypePdf, IconSearch, IconTrash, IconUpload } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import type { CandidateCv } from "@/shared/api/resources/cv-archive";
import styles from "@/shared/ui/parity.module.css";

const MAX_PDF_BYTES = 4 * 1024 * 1024;

export function CvArchive() {
  const queryClient = useQueryClient();
  const [candidateName, setCandidateName] = useState("");
  const [targetPosition, setTargetPosition] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<CandidateCv | null>(null);

  const archive = useQuery({
    queryKey: ["cv-candidate-archive"],
    queryFn: () => getBrowserApi().cvArchive.list(),
    staleTime: 30_000,
  });
  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Selecciona un PDF.");
      return getBrowserApi().cvArchive.upload({
        candidateName: candidateName.trim(),
        targetPosition: targetPosition.trim(),
        notes: notes.trim(),
        file,
      });
    },
    onSuccess: () => {
      setCandidateName("");
      setTargetPosition("");
      setNotes("");
      setFile(null);
      void queryClient.invalidateQueries({ queryKey: ["cv-candidate-archive"] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => getBrowserApi().cvArchive.remove(id),
    onSuccess: () => {
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ["cv-candidate-archive"] });
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es-ES");
    if (!term) return archive.data?.items ?? [];
    return (archive.data?.items ?? []).filter((item) =>
      [item.candidateName, item.targetPosition ?? "", item.notes ?? ""]
        .some((text) => text.toLocaleLowerCase("es-ES").includes(term)),
    );
  }, [archive.data, search]);

  const validFile = Boolean(file && file.size > 0 && file.size <= MAX_PDF_BYTES &&
    file.type === "application/pdf" && file.name.toLowerCase().endsWith(".pdf"));

  return (
    <Stack gap="md">
      <section className={styles.section}>
        <Group justify="space-between" mb="xs">
          <h3 className={styles.sectionTitle}>Guardar currículum de candidato</h3>
          <Badge variant="light" color="gray">Supabase privado</Badge>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Almacena PDF de personas que han enviado su candidatura. No es necesario registrarlas como empleadas.
        </Text>
        <Stack gap="sm">
          <TextInput
            required label="Nombre del candidato" maxLength={160}
            placeholder="Nombre y apellidos"
            value={candidateName}
            onChange={(event) => setCandidateName(event.currentTarget.value)}
          />
          <TextInput
            label="Puesto solicitado" maxLength={120}
            placeholder="Odontólogo, higienista, auxiliar, recepción…"
            value={targetPosition}
            onChange={(event) => setTargetPosition(event.currentTarget.value)}
          />
          <Textarea label="Notas (opcional)" maxLength={1000} minRows={2}
            placeholder="Fecha de entrevista o comentarios"
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
          />
          <Group gap="sm">
            <FileButton accept="application/pdf,.pdf" onChange={setFile}>
              {(props) => (
                <Button {...props} variant="light" leftSection={<IconFileTypePdf size={16} />}>
                  Seleccionar PDF
                </Button>
              )}
            </FileButton>
            <Text size="sm" c="dimmed">{file?.name ?? "Tamaño máximo: 4 MB"}</Text>
          </Group>
          {file && !validFile ? <Alert color="orange">Selecciona un PDF válido de hasta 4 MB.</Alert> : null}
          {upload.isError ? (
            <Alert color="red">{upload.error instanceof Error ? upload.error.message : "No se pudo subir el PDF."}</Alert>
          ) : null}
          <Group justify="flex-end">
            <Button leftSection={<IconUpload size={16} />}
              disabled={!validFile || candidateName.trim().length < 2}
              loading={upload.isPending}
              onClick={() => upload.mutate()}>
              Guardar PDF en Supabase
            </Button>
          </Group>
        </Stack>
      </section>

      <section className={styles.section}>
        <Group justify="space-between" mb="md">
          <h3 className={styles.sectionTitle}>Archivo de currículums</h3>
          <Badge variant="light">{archive.data?.items.length ?? 0} candidatos</Badge>
        </Group>
        <TextInput
          leftSection={<IconSearch size={16} />}
          placeholder="Buscar por nombre, puesto o notas"
          aria-label="Buscar en archivo de currículums"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          mb="md"
        />
        {archive.isError ? (
          <Alert color="red">No se pudo leer el archivo de Supabase. Comprueba la conexión y los permisos.</Alert>
        ) : null}
        {archive.isPending ? <Text c="dimmed">Cargando currículums…</Text> : null}
        <div className={styles.rowList}>
          {filtered.map((item) => (
            <div className={styles.row} key={item.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{item.candidateName}</span>
                <span className={styles.rowMeta}>
                  {item.targetPosition ? item.targetPosition + " · " : ""}
                  {new Date(item.createdAt).toLocaleDateString("es-ES")} ·
                  {" "}{Math.ceil(item.fileSizeBytes / 1024)} KB · {item.fileName}
                </span>
                {item.notes ? <Text size="xs" c="dimmed">{item.notes}</Text> : null}
              </div>
              <div className={styles.rowActions}>
                <Button size="xs" variant="light" component="a"
                  href={"/api/cv-archive?id=" + encodeURIComponent(item.id)}>
                  Descargar PDF
                </Button>
                <Button size="xs" variant="subtle" color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => setDeleting(item)}>Eliminar</Button>
              </div>
            </div>
          ))}
          {archive.isSuccess && filtered.length === 0 ? (
            <Text c="dimmed">{search ? "No se encontraron coincidencias." : "Todavía no hay currículums archivados."}</Text>
          ) : null}
        </div>
      </section>

      <Modal opened={deleting !== null} onClose={() => setDeleting(null)}
        title="Eliminar currículum" centered>
        <Stack gap="md">
          <Text>
            ¿Eliminar el PDF de <strong>{deleting?.candidateName}</strong> del archivo y de Supabase Storage?
          </Text>
          {remove.isError ? (
            <Alert color="red">
              {remove.error instanceof Error ? remove.error.message : "No se pudo eliminar."}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button color="red" loading={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}>
              Eliminar definitivamente
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
