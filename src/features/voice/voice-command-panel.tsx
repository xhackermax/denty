"use client";

import { Alert, Badge, Button, Group, Stack, Text, Textarea } from "@mantine/core";
import {
  IconAlertCircle,
  IconEraser,
  IconMicrophone,
  IconPlayerStopFilled,
  IconSparkles,
} from "@tabler/icons-react";
import { useRef, type RefObject } from "react";

import { shouldSubmitOnKey, voiceStatusLabel, type VoiceStatus } from "./command-input";
import styles from "./voice-command-bar.module.css";

export interface VoicePreviewDetail {
  label: string;
  value: string;
}

export interface VoicePreviewView {
  readback: string;
  patientLabel?: string;
  actions: readonly { description: string; details: readonly VoicePreviewDetail[] }[];
  ambiguities: readonly string[];
  blockers: readonly string[];
  canConfirm: boolean;
  source: "rules" | "claude";
}

export interface VoicePatientChoices {
  title: string;
  verb: string;
  options: readonly { id: string; label: string }[];
}

export interface VoicePanelMessage {
  tone: "error" | "done" | "info";
  text: string;
}

export interface VoiceCommandPanelProps {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
  onTextChange: (text: string) => void;
  status: VoiceStatus;
  listening: boolean;
  microphoneDisabled?: boolean;
  showKeyboardDictationHint: boolean;
  preview: VoicePreviewView | null;
  patientChoices: VoicePatientChoices | null;
  message: VoicePanelMessage | null;
  onToggleMicrophone: () => void;
  onInterpret: () => void;
  onClear: () => void;
  onConfirm: () => void;
  onCancelPreview: () => void;
  onChoosePatient: (patientId: string) => void;
}

const BUSY: ReadonlySet<VoiceStatus> = new Set(["interpreting", "executing", "finalizing"]);

export function VoiceCommandPanel({
  inputRef,
  text,
  onTextChange,
  status,
  listening,
  microphoneDisabled = false,
  showKeyboardDictationHint,
  preview,
  patientChoices,
  message,
  onToggleMicrophone,
  onInterpret,
  onClear,
  onConfirm,
  onCancelPreview,
  onChoosePatient,
}: VoiceCommandPanelProps) {
  const composingRef = useRef(false);
  const interpretAfterCompositionRef = useRef(false);
  const busy = BUSY.has(status);
  const empty = !text.trim();

  const interpretNow = () => {
    onInterpret();
    // Closing the on-screen keyboard keeps the preview and the confirmation visible.
    inputRef.current?.blur();
  };

  const requestInterpret = () => {
    if (composingRef.current) {
      interpretAfterCompositionRef.current = true;
      return;
    }
    interpretNow();
  };

  return (
    <Stack gap="sm">
      <Textarea
        ref={inputRef}
        label="Escribe o dicta una instrucción"
        placeholder="Marca caries en el dieciséis"
        value={text}
        autosize
        minRows={2}
        maxRows={5}
        enterKeyHint="go"
        autoComplete="off"
        spellCheck
        // Dictation rewrites the field while listening; typing then would be lost.
        readOnly={listening}
        onChange={(event) => onTextChange(event.currentTarget.value)}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
          if (interpretAfterCompositionRef.current) {
            interpretAfterCompositionRef.current = false;
            interpretNow();
          }
        }}
        onKeyDown={(event) => {
          const submit = shouldSubmitOnKey({
            key: event.key,
            shiftKey: event.shiftKey,
            isComposing: composingRef.current || event.nativeEvent.isComposing,
            keyCode: event.keyCode,
          });
          if (!submit) return;
          event.preventDefault();
          if (!empty && !busy && !listening) interpretNow();
        }}
      />

      {showKeyboardDictationHint ? (
        <Text size="xs" c="dimmed">
          También puedes usar el micrófono de tu teclado.
        </Text>
      ) : null}

      <Group gap="xs" justify="space-between" wrap="nowrap">
        <Button
          variant={listening ? "filled" : "light"}
          color={listening ? "red" : "gray"}
          size="sm"
          radius="xl"
          className={styles.panelButton}
          aria-label={listening ? "Detener micrófono" : "Micrófono"}
          disabled={microphoneDisabled || (!listening && busy)}
          leftSection={
            listening ? <IconPlayerStopFilled size={15} /> : <IconMicrophone size={16} />
          }
          onClick={onToggleMicrophone}
        >
          {listening ? "Detener" : "Micrófono"}
        </Button>
        <Group gap="xs" wrap="nowrap">
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            radius="xl"
            className={styles.panelButton}
            aria-label="Limpiar"
            disabled={empty || listening}
            leftSection={<IconEraser size={15} />}
            onClick={onClear}
          >
            <span className={styles.collapsibleLabel}>Limpiar</span>
          </Button>
          <Button
            size="sm"
            radius="xl"
            className={styles.panelButton}
            disabled={empty || listening || busy}
            loading={status === "interpreting"}
            leftSection={<IconSparkles size={15} />}
            onClick={requestInterpret}
          >
            Interpretar
          </Button>
        </Group>
      </Group>

      <div role="status" aria-live="polite" className={styles.statusLine} data-status={status}>
        {listening ? <span className={styles.recordingDot} aria-hidden="true" /> : null}
        <Text span size="xs" c={status === "error" ? "red" : "dimmed"}>
          {voiceStatusLabel(status)}
        </Text>
      </div>

      {message ? (
        message.tone === "error" ? (
          <Alert
            role="alert"
            color="red"
            variant="light"
            icon={<IconAlertCircle size={16} />}
            p="xs"
          >
            <Text size="sm">{message.text}</Text>
          </Alert>
        ) : (
          <Text size="xs" c={message.tone === "done" ? "teal" : "dimmed"} lineClamp={3}>
            {message.text}
          </Text>
        )
      ) : null}

      {patientChoices ? (
        <section className={styles.previewCard} aria-label={patientChoices.title}>
          <Stack gap="xs">
            <Text fw={700} size="sm">
              {patientChoices.title}
            </Text>
            {patientChoices.options.map((option) => (
              <Button
                key={option.id}
                variant="light"
                radius="xl"
                justify="space-between"
                aria-label={`${patientChoices.verb} ${option.label}`}
                onClick={() => onChoosePatient(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </Stack>
        </section>
      ) : null}

      {preview ? (
        <VoicePreviewCard
          preview={preview}
          executing={status === "executing"}
          onConfirm={onConfirm}
          onCancel={onCancelPreview}
        />
      ) : null}
    </Stack>
  );
}

function VoicePreviewCard({
  preview,
  executing,
  onConfirm,
  onCancel,
}: {
  preview: VoicePreviewView;
  executing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <section className={styles.previewCard} aria-label="Vista previa de la acción">
      <Stack gap="xs">
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text fw={700} size="sm">
            {preview.readback}
          </Text>
          {preview.source === "claude" ? (
            <Badge size="xs" variant="light" color="violet">
              IA
            </Badge>
          ) : null}
        </Group>

        {preview.patientLabel ? (
          <div className={styles.previewRow}>
            <Text size="xs" c="dimmed">
              Paciente
            </Text>
            <Text size="sm" fw={600}>
              {preview.patientLabel}
            </Text>
          </div>
        ) : null}

        {preview.actions.map((action, index) => (
          <div key={`${action.description}-${index}`} className={styles.previewAction}>
            <Text size="sm">{action.description}</Text>
            {action.details.map((detail) => (
              <div key={detail.label} className={styles.previewRow}>
                <Text size="xs" c="dimmed">
                  {detail.label}
                </Text>
                <Text size="sm">{detail.value}</Text>
              </div>
            ))}
          </div>
        ))}

        {preview.ambiguities.length ? (
          <Text size="sm" c="orange.8">
            Faltan datos: {preview.ambiguities.join(" · ")}
          </Text>
        ) : null}
        {preview.blockers.map((blocker) => (
          <Text key={blocker} size="sm" c="orange.8">
            {blocker}
          </Text>
        ))}

        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="sm" radius="xl" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            size="sm"
            radius="xl"
            disabled={!preview.canConfirm || executing}
            loading={executing}
            onClick={onConfirm}
          >
            Confirmar
          </Button>
        </Group>
      </Stack>
    </section>
  );
}
