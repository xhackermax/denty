"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  List,
  Modal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconAlertCircle, IconMicrophone, IconSparkles } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { executeVoicePlan } from "./voice-executor";

import {
  canExecuteVoicePreview,
  previewVoiceCommand,
  primaryHrefForVoicePlan,
  type VoicePreview,
} from "./voice-router";

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<{ 0: { transcript: string } }>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function VoiceCommandBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<VoicePreview | null>(null);
  const [listening, setListening] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const interpret = () => {
    if (!text.trim()) return;
    setPreview(previewVoiceCommand(text, { pathname }));
  };

  const execute = async () => {
    if (!preview || !canExecuteVoicePreview(preview)) return;
    setExecuting(true);
    setExecutionError(null);
    try {
      await executeVoicePlan(preview.plan);
      const href = primaryHrefForVoicePlan(preview.plan);
      if (href) router.push(href);
      setPreview(null);
      setText("");
    } catch (error) {
      setExecutionError(
        error instanceof Error ? error.message : "No se pudo ejecutar el plan de voz.",
      );
    } finally {
      setExecuting(false);
    }
  };

  const listen = () => {
    const speechWindow = window as WindowWithSpeech;
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setText("Oye Denty, abre agenda");
      return;
    }
    const recognition = new Constructor();
    recognition.lang = "es-ES";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setText(transcript);
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  return (
    <>
      <Group gap={6} wrap="nowrap">
        <TextInput
          size="xs"
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          placeholder="Oye Denty…"
          aria-label="Comando para Denty"
          onKeyDown={(event) => {
            if (event.key === "Enter") interpret();
          }}
        />
        <ActionIcon
          size="lg"
          variant={listening ? "filled" : "light"}
          aria-label="Escuchar comando"
          onClick={listen}
        >
          <IconMicrophone size={18} />
        </ActionIcon>
        <ActionIcon size="lg" variant="light" aria-label="Interpretar comando" onClick={interpret}>
          <IconSparkles size={18} />
        </ActionIcon>
      </Group>

      <Modal
        opened={preview !== null}
        onClose={() => setPreview(null)}
        title="Previsualizar acción de Denty"
      >
        {preview ? (
          <Stack gap="md">
            <div>
              <Text fw={800}>{preview.plan.readback}</Text>
              <Group gap="xs" mt="xs">
                <Badge variant="light">
                  {Math.round(preview.plan.confidence * 100)}% confianza
                </Badge>
                <Badge variant="outline">Plan {preview.planToken.slice(0, 8)}</Badge>
              </Group>
            </div>

            {preview.plan.ambiguities.length ? (
              <Alert icon={<IconAlertCircle size={18} />} color="yellow" title="Faltan datos">
                {preview.plan.ambiguities.join(" · ")}
              </Alert>
            ) : null}

            <List size="sm" spacing="xs">
              {preview.plan.actions.map((action, index) => (
                <List.Item key={`${action.type}-${index}`}>{action.type}</List.Item>
              ))}
            </List>

            <Text c="dimmed" size="sm">
              Denty interpreta primero y ejecuta después. Cobros, ausencias y actos clínicos
              realizados requieren confirmación explícita.
            </Text>

            {executionError ? (
              <Alert color="red" title="No se pudo ejecutar">
                {executionError}
              </Alert>
            ) : null}

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setPreview(null)}>
                Cancelar
              </Button>
              <Button
                disabled={!canExecuteVoicePreview(preview)}
                loading={executing}
                onClick={() => void execute()}
              >
                Confirmar y ejecutar
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>
    </>
  );
}
