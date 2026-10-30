"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { IconMessageReport } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  FEEDBACK_NOTE_KINDS,
  FEEDBACK_NOTE_STATUSES,
  feedbackNoteInputSchema,
  type FeedbackNote,
  type FeedbackNoteKind,
  type FeedbackNoteStatus,
} from "@/shared/api";

import {
  useCreateFeedbackNoteMutation,
  useFeedbackNoteStatusMutation,
  useFeedbackNotesQuery,
  useIsFeedbackAdmin,
} from "./feedback-data";
import styles from "./feedback-inbox.module.css";

export const FEEDBACK_KIND_LABELS: Record<FeedbackNoteKind, string> = {
  BUG: "Algo falla",
  IDEA: "Mejora",
  OTHER: "Otro",
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackNoteStatus, string> = {
  NEW: "Nueva",
  REVIEWED: "Revisada",
  DONE: "Resuelta",
  DISMISSED: "Descartada",
};

const KIND_COLORS: Record<FeedbackNoteKind, string> = { BUG: "red", IDEA: "teal", OTHER: "gray" };
const OPEN_STATUSES: readonly FeedbackNoteStatus[] = ["NEW", "REVIEWED"];

const dateFormat = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

/** Header button that opens the feedback inbox from any staff page. */
export function FeedbackInboxButton() {
  const [opened, setOpened] = useState(false);
  return (
    <>
      <Tooltip label="Notas y recomendaciones">
        <ActionIcon
          variant="subtle"
          size="lg"
          aria-label="Notas y recomendaciones"
          onClick={() => setOpened(true)}
        >
          <IconMessageReport size={19} />
        </ActionIcon>
      </Tooltip>
      <FeedbackInbox opened={opened} onClose={() => setOpened(false)} />
    </>
  );
}

export function FeedbackInbox({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      title="Notas y recomendaciones"
      closeButtonProps={{ "aria-label": "Cerrar" }}
    >
      {opened ? (
        <Stack gap="lg">
          <FeedbackForm />
          <FeedbackList />
        </Stack>
      ) : null}
    </Drawer>
  );
}

function FeedbackForm() {
  const pathname = usePathname();
  const create = useCreateFeedbackNoteMutation();
  const [kind, setKind] = useState<FeedbackNoteKind>("BUG");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = feedbackNoteInputSchema.safeParse({ kind, message, pagePath: pathname });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa la nota.");
      return;
    }
    setError(null);
    setSent(false);
    create.mutate(parsed.data, {
      onSuccess: () => {
        setMessage("");
        setSent(true);
      },
      onError: () => setError("No se pudo guardar la nota. Inténtalo de nuevo."),
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Si algo no funciona o se te ocurre una mejora, déjalo aquí. Lo verá todo el equipo.
        </Text>
        <SegmentedControl
          fullWidth
          value={kind}
          onChange={(value) => setKind(value as FeedbackNoteKind)}
          data={FEEDBACK_NOTE_KINDS.map((value) => ({
            value,
            label: FEEDBACK_KIND_LABELS[value],
          }))}
          aria-label="Tipo de nota"
        />
        <Textarea
          label="Tu comentario"
          placeholder="Qué estabas haciendo, qué esperabas y qué pasó…"
          autosize
          minRows={3}
          maxRows={8}
          value={message}
          onChange={(event) => {
            setMessage(event.currentTarget.value);
            setSent(false);
          }}
          error={error}
        />
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            Se guarda la página actual: {pathname}
          </Text>
          <Button type="submit" loading={create.isPending}>
            Enviar nota
          </Button>
        </Group>
        {sent ? (
          <Alert color="teal" variant="light">
            Gracias, la nota se ha guardado.
          </Alert>
        ) : null}
      </Stack>
    </form>
  );
}

function FeedbackList() {
  const notes = useFeedbackNotesQuery(true);
  const isAdmin = useIsFeedbackAdmin();
  const [filter, setFilter] = useState<"open" | "all">("open");

  if (notes.isPending) return <Loader size="sm" aria-label="Cargando notas" />;
  if (notes.isError)
    return (
      <Alert color="red" variant="light">
        No se pudieron cargar las notas.
      </Alert>
    );

  const visible =
    filter === "open"
      ? notes.data.filter((note) => OPEN_STATUSES.includes(note.status))
      : notes.data;

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={600}>Buzón ({visible.length})</Text>
        <SegmentedControl
          size="xs"
          value={filter}
          onChange={(value) => setFilter(value as "open" | "all")}
          data={[
            { value: "open", label: "Pendientes" },
            { value: "all", label: "Todas" },
          ]}
          aria-label="Filtrar notas"
        />
      </Group>
      {visible.length === 0 ? (
        <Text size="sm" c="dimmed">
          No hay notas {filter === "open" ? "pendientes" : "todavía"}.
        </Text>
      ) : (
        <Stack gap="xs" component="ul" className={styles.list}>
          {visible.map((note) => (
            <FeedbackNoteItem key={note.id} note={note} isAdmin={isAdmin} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function FeedbackNoteItem({ note, isAdmin }: { note: FeedbackNote; isAdmin: boolean }) {
  const setStatus = useFeedbackNoteStatusMutation();
  return (
    <li className={styles.note}>
      <Group justify="space-between" gap="xs" mb={4}>
        <Group gap={6}>
          <Badge size="sm" variant="light" color={KIND_COLORS[note.kind]}>
            {FEEDBACK_KIND_LABELS[note.kind]}
          </Badge>
          {isAdmin ? null : (
            <Badge size="sm" variant="outline" color="gray">
              {FEEDBACK_STATUS_LABELS[note.status]}
            </Badge>
          )}
        </Group>
        {isAdmin ? (
          <Select
            size="xs"
            w={130}
            aria-label="Estado de la nota"
            allowDeselect={false}
            value={note.status}
            disabled={setStatus.isPending}
            onChange={(value) =>
              value && setStatus.mutate({ noteId: note.id, status: value as FeedbackNoteStatus })
            }
            data={FEEDBACK_NOTE_STATUSES.map((value) => ({
              value,
              label: FEEDBACK_STATUS_LABELS[value],
            }))}
          />
        ) : null}
      </Group>
      <Text size="sm" className={styles.message}>
        {note.message}
      </Text>
      <Text size="xs" c="dimmed" mt={4}>
        {note.authorName} · {dateFormat.format(new Date(note.createdAt))}
        {note.pagePath ? ` · ${note.pagePath}` : ""}
      </Text>
    </li>
  );
}
