"use client";

import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconEye, IconEyeOff } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import {
  CATALOG_QUALITY_RULES,
  CLINICAL_SOURCES,
  TRADEOFF_CATALOG_VERSION,
  TRADEOFF_ENTRIES,
  TRADEOFF_SPECIALTIES,
  customPhraseId,
  libraryPhrases,
  phraseOverride,
  reorderOverrides,
  type ArgumentOverride,
  type LibraryPhrase,
  type TradeoffEntry,
  type TradeoffKind,
} from "@/domain/plan";
import { normalized } from "@/domain/plan/treatment-phase";
import { DentyApiError } from "@/shared/api/errors";
import {
  useArgumentHistoryQuery,
  useArgumentOverridesQuery,
  useRestoreArgumentOverrides,
  useSaveArgumentOverrides,
} from "@/shared/clinical/clinical-arguments-data";

import styles from "./admin-clinical-arguments-panel.module.css";

const MAX_RESULTS = 40;
const KIND_TITLES: Record<TradeoffKind, string> = {
  advantage: "Ventajas",
  disadvantage: "Desventajas",
};

function errorText(error: unknown): string {
  return error instanceof DentyApiError || error instanceof Error
    ? error.message
    : "No se pudo guardar el cambio.";
}

function PhraseRow({
  phrase,
  first,
  last,
  busy,
  onEdit,
  onToggle,
  onMove,
  onRestore,
}: {
  phrase: LibraryPhrase;
  first: boolean;
  last: boolean;
  busy: boolean;
  onEdit: (text: string) => void;
  onToggle: () => void;
  onMove: (step: -1 | 1) => void;
  onRestore: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;
  return (
    <Group gap={6} wrap="nowrap" align="flex-start">
      <Stack gap={2} className={styles.grow}>
        {editing ? (
          <TextInput
            size="xs"
            aria-label="Texto de la frase"
            value={draft}
            maxLength={300}
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
        ) : (
          <Text size="sm" {...(phrase.hidden ? { c: "dimmed", td: "line-through" } : {})}>
            {phrase.text}
          </Text>
        )}
        <Group gap={4}>
          {phrase.custom ? (
            <Badge size="xs" color="grape" variant="light">
              Propia
            </Badge>
          ) : null}
          {phrase.hidden ? (
            <Badge size="xs" color="gray" variant="light">
              Oculta
            </Badge>
          ) : null}
          {phrase.changed && !phrase.custom && phrase.text !== phrase.templateText ? (
            <Badge size="xs" color="blue" variant="light">
              Editada
            </Badge>
          ) : null}
        </Group>
      </Stack>
      {editing ? (
        <Group gap={4} wrap="nowrap">
          <Button
            size="compact-xs"
            disabled={busy || !draft.trim()}
            onClick={() => {
              onEdit(draft);
              setDraft(null);
            }}
          >
            Guardar
          </Button>
          <Button size="compact-xs" variant="default" onClick={() => setDraft(null)}>
            Cancelar
          </Button>
        </Group>
      ) : (
        <Group gap={2} wrap="nowrap">
          <ActionIcon
            variant="subtle"
            aria-label={`Subir: ${phrase.text}`}
            disabled={busy || first}
            onClick={() => onMove(-1)}
          >
            <IconArrowUp size={14} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            aria-label={`Bajar: ${phrase.text}`}
            disabled={busy || last}
            onClick={() => onMove(1)}
          >
            <IconArrowDown size={14} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            aria-label={`${phrase.hidden ? "Mostrar" : "Ocultar"}: ${phrase.text}`}
            disabled={busy}
            onClick={onToggle}
          >
            {phrase.hidden ? <IconEye size={14} /> : <IconEyeOff size={14} />}
          </ActionIcon>
          <Button
            size="compact-xs"
            variant="subtle"
            disabled={busy}
            onClick={() => setDraft(phrase.text)}
          >
            Editar
          </Button>
          {phrase.changed ? (
            <Button
              size="compact-xs"
              variant="subtle"
              color="red"
              disabled={busy}
              onClick={onRestore}
            >
              {phrase.custom ? "Eliminar" : "Restaurar"}
            </Button>
          ) : null}
        </Group>
      )}
    </Group>
  );
}

function AddPhrase({
  kind,
  busy,
  onAdd,
}: {
  kind: TradeoffKind;
  busy: boolean;
  onAdd: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const label = kind === "advantage" ? "Nueva ventaja" : "Nueva desventaja";
  return (
    <Group gap={6} wrap="nowrap">
      <TextInput
        size="xs"
        className={styles.grow}
        aria-label={label}
        placeholder={`${label} propia de la clínica`}
        value={text}
        maxLength={300}
        onChange={(event) => setText(event.currentTarget.value)}
      />
      <Button
        size="compact-xs"
        variant="light"
        disabled={busy || !text.trim()}
        onClick={() => {
          onAdd(text.trim());
          setText("");
        }}
      >
        Añadir
      </Button>
    </Group>
  );
}

function EntryHistory({ entryId }: { entryId: string }) {
  const history = useArgumentHistoryQuery(entryId);
  const items = history.data?.items ?? [];
  if (history.isLoading)
    return (
      <Text size="xs" c="dimmed">
        Cargando historial…
      </Text>
    );
  if (!items.length)
    return (
      <Text size="xs" c="dimmed">
        Sin cambios registrados.
      </Text>
    );
  return (
    <ul aria-label="Historial de cambios" className={styles.history}>
      {items.map((item) => (
        <li key={item.id}>
          <Text size="xs">
            {new Date(item.changedAt).toLocaleString("es-ES")} ·{" "}
            {item.action === "RESTORE" ? "Restaurada" : item.hidden ? "Oculta" : "Guardada"}
            {item.text ? `: «${item.text}»` : ""}
          </Text>
        </li>
      ))}
    </ul>
  );
}

function EntryEditor({
  entry,
  overrides,
}: {
  entry: TradeoffEntry;
  overrides: readonly ArgumentOverride[];
}) {
  const save = useSaveArgumentOverrides();
  const restore = useRestoreArgumentOverrides();
  const [showHistory, setShowHistory] = useState(false);
  const phrases = useMemo(() => libraryPhrases(entry, overrides), [entry, overrides]);
  const own = overrides.filter((item) => item.entryId === entry.id);
  const busy = save.isPending || restore.isPending;
  const failure = save.error ?? restore.error;

  const change = (phrase: LibraryPhrase, patch: { text?: string; hidden?: boolean }) =>
    save.mutate([phraseOverride(entry.id, phrase, overrides, patch)]);

  return (
    <Stack gap="sm">
      {failure ? (
        <Alert color="red" p="xs">
          {errorText(failure)}
        </Alert>
      ) : null}
      {(["advantage", "disadvantage"] as const).map((kind) => {
        const list = phrases.filter((phrase) => phrase.kind === kind);
        return (
          <section key={kind} aria-label={`${KIND_TITLES[kind]} · ${entry.name}`}>
            <Text size="xs" fw={700} mb={4}>
              {KIND_TITLES[kind]}
            </Text>
            <Stack gap={6}>
              {list.map((phrase, index) => (
                <PhraseRow
                  key={phrase.id}
                  phrase={phrase}
                  first={index === 0}
                  last={index === list.length - 1}
                  busy={busy}
                  onEdit={(text) => change(phrase, { text })}
                  onToggle={() => change(phrase, { hidden: !phrase.hidden })}
                  onMove={(step) => {
                    const items = reorderOverrides(entry, phrases, overrides, phrase.id, step);
                    if (items.length) save.mutate(items);
                  }}
                  onRestore={() => restore.mutate([phrase.id])}
                />
              ))}
              <AddPhrase
                kind={kind}
                busy={busy}
                onAdd={(text) =>
                  save.mutate([
                    {
                      phraseId: customPhraseId(
                        entry.id,
                        phrases.map((phrase) => phrase.id),
                      ),
                      entryId: entry.id,
                      kind,
                      text,
                      hidden: false,
                      position: null,
                      custom: true,
                    },
                  ])
                }
              />
            </Stack>
          </section>
        );
      })}
      <Group gap="xs">
        <Button
          size="compact-xs"
          variant="default"
          disabled={busy || !own.length}
          onClick={() => restore.mutate(own.map((item) => item.phraseId))}
        >
          Restaurar plantilla
        </Button>
        <Button
          size="compact-xs"
          variant="subtle"
          onClick={() => setShowHistory((value) => !value)}
        >
          {showHistory ? "Ocultar historial" : "Ver historial"}
        </Button>
      </Group>
      {showHistory ? <EntryHistory entryId={entry.id} /> : null}
    </Stack>
  );
}

/**
 * Admin editor for the clinical phrase library: each clinic words, hides, orders and extends
 * the template phrases; "Restaurar" goes back to the template. Changes reach every new plan
 * comparison; comparisons already shown to a patient keep their saved copy.
 */
export function AdminClinicalArgumentsPanel() {
  const query = useArgumentOverridesQuery();
  const overrides = query.data?.items ?? [];
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [onlyChanged, setOnlyChanged] = useState(false);
  // Editors mount only when opened: the closed list holds up to MAX_RESULTS treatments.
  const [opened, setOpened] = useState<string[]>([]);
  const changedIds = useMemo(() => new Set(overrides.map((item) => item.entryId)), [overrides]);

  const matches = useMemo(() => {
    const words = normalized(search).split(/\s+/).filter(Boolean);
    return TRADEOFF_ENTRIES.filter(
      (entry) =>
        (!specialty || entry.specialty === specialty) &&
        (!onlyChanged || changedIds.has(entry.id)) &&
        words.every((word) => normalized(entry.name).includes(word)),
    );
  }, [search, specialty, onlyChanged, changedIds]);

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Frases de ventajas y desventajas que el odontólogo puede marcar al comparar planes.
        Plantilla clínica v{TRADEOFF_CATALOG_VERSION}, pendiente de revisión profesional.
      </Text>
      <details className={styles.rules}>
        <summary>Criterios de calidad y fuentes</summary>
        <ul aria-label="Criterios de calidad">
          {CATALOG_QUALITY_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <ul aria-label="Fuentes para validar">
          {CLINICAL_SOURCES.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.organisation}
              </a>
              . {source.citation}
            </li>
          ))}
        </ul>
      </details>
      {query.isError ? (
        <Alert color="red">No se pudieron cargar los cambios de la clínica.</Alert>
      ) : null}
      <Group gap="xs" align="flex-end">
        <TextInput
          label="Buscar tratamiento"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          className={styles.search}
        />
        <Select
          label="Especialidad"
          clearable
          data={TRADEOFF_SPECIALTIES.map((item) => ({ value: item.id, label: item.name }))}
          value={specialty}
          onChange={setSpecialty}
        />
        <Button
          variant={onlyChanged ? "filled" : "default"}
          aria-pressed={onlyChanged}
          onClick={() => setOnlyChanged((value) => !value)}
        >
          Solo cambiados ({changedIds.size})
        </Button>
      </Group>
      {matches.length ? (
        <Accordion
          multiple
          value={opened}
          onChange={setOpened}
          variant="separated"
          radius="md"
          chevronPosition="left"
        >
          {matches.slice(0, MAX_RESULTS).map((entry) => (
            <Accordion.Item key={entry.id} value={entry.id}>
              <Accordion.Control>
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    {entry.name}
                  </Text>
                  {/* The same treatment can be in both parts of the source document. */}
                  <Text size="xs" c="dimmed">
                    {entry.source === "bank" ? "Banco de frases" : "Matriz"}
                  </Text>
                  {changedIds.has(entry.id) ? (
                    <Badge size="xs" variant="light">
                      Personalizado
                    </Badge>
                  ) : null}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                {opened.includes(entry.id) ? (
                  <EntryEditor entry={entry} overrides={overrides} />
                ) : null}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      ) : (
        <Text size="sm" c="dimmed">
          Ningún tratamiento coincide con la búsqueda.
        </Text>
      )}
      {matches.length > MAX_RESULTS ? (
        <Text size="xs" c="dimmed">
          Se muestran {MAX_RESULTS} de {matches.length}. Afina la búsqueda para ver el resto.
        </Text>
      ) : null}
    </Stack>
  );
}
