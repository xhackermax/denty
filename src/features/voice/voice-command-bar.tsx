"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  List,
  Modal,
  Popover,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconMicrophone,
  IconMicrophoneOff,
  IconSparkles,
} from "@tabler/icons-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { publicEnv } from "@/shared/config/env";
import { DEMO_PATIENTS } from "@/shared/demo/demo-data";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { requestMediaPermission } from "@/shared/ui/device-permissions";

import motionStyles from "./voice-command-bar.module.css";

import { executeVoicePlan } from "./voice-executor";
import { resolveVoicePatient, type VoicePatientCandidate } from "./voice-patient-resolver";
import {
  canExecuteVoicePreview,
  previewVoiceCommand,
  primaryHrefForVoicePlan,
  type VoicePreview,
} from "./voice-router";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence?: number;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal?: boolean;
  length: number;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex?: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error?: string;
  message?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type VoiceEngine = "web-speech" | "recording" | null;

function speechErrorMessage(error?: string): string {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Micrófono bloqueado. Permítelo desde el candado del navegador.";
  }
  if (error === "audio-capture") {
    return "No hay micrófono disponible.";
  }
  if (error === "no-speech") {
    return "No he oído la orden. Inténtalo de nuevo.";
  }
  if (error === "network") {
    return "La voz no pudo conectarse.";
  }
  return "No se pudo reconocer la orden de voz.";
}

function isNavigationOnly(preview: VoicePreview): boolean {
  const actionable = preview.plan.actions.filter((action) => action.type !== "patient.resolve");
  return (
    actionable.length > 0 &&
    actionable.every(
      (action) => action.type === "navigation.open" || action.type === "navigation.patient",
    )
  );
}

function patientQueryFromPreview(preview: VoicePreview): string | undefined {
  for (const action of preview.plan.actions) {
    if (action.type === "patient.resolve" && action.query.trim()) return action.query.trim();
    if (action.type === "navigation.patient" && action.patientRef.trim()) {
      return action.patientRef.trim();
    }
  }
  return undefined;
}

function bestRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  return options.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

export function VoiceCommandBar() {
  const router = useRouter();
  const pathname = usePathname();
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const reducedMotion = useReducedMotion();
  const patientsQuery = usePatientsQuery(!demoMode);

  const [text, setText] = useState("");
  const [commandOpened, setCommandOpened] = useState(false);
  const [preview, setPreview] = useState<VoicePreview | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>(null);
  const [executing, setExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [heard, setHeard] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const keepListeningRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStartedRef = useRef(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const recorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderChunksRef = useRef<BlobPart[]>([]);

  const patients = useMemo<readonly VoicePatientCandidate[]>(() => {
    if (demoMode) return DEMO_PATIENTS;
    return (patientsQuery.data?.items ?? []).map((patient) => ({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      ...(patient.recordNumber ? { recordNumber: patient.recordNumber } : {}),
    }));
  }, [demoMode, patientsQuery.data]);

  const resolvePreview = useCallback(
    (base: VoicePreview): VoicePreview => {
      const query = patientQueryFromPreview(base);
      if (!query || base.plan.contextPatientId) return base;

      const matches = resolveVoicePatient(query, patients);
      const best = matches[0];
      if (!best) {
        return {
          ...base,
          plan: {
            ...base.plan,
            ambiguities: [...base.plan.ambiguities, `paciente «${query}» no encontrado`],
            readback: `No encuentro al paciente ${query}.`,
            confidence: Math.min(base.plan.confidence, 0.55),
          },
        };
      }

      const second = matches[1];
      if (second && best.score < 0.98 && best.score - second.score < 0.08) {
        return {
          ...base,
          plan: {
            ...base.plan,
            ambiguities: [
              ...base.plan.ambiguities,
              `varios pacientes coinciden con «${query}»: ${best.label} / ${second.label}`,
            ],
            readback: `Hay varios pacientes parecidos a ${query}.`,
            confidence: Math.min(base.plan.confidence, 0.68),
          },
        };
      }

      return {
        ...base,
        plan: {
          ...base.plan,
          contextPatientId: best.id,
          readback: base.plan.actions.some((action) => action.type === "navigation.patient")
            ? `Abriendo la ficha de ${best.label}${best.recordNumber ? `, ficha ${best.recordNumber}` : ""}.`
            : base.plan.readback,
          confidence: Math.max(base.plan.confidence, best.score),
        },
      };
    },
    [patients],
  );

  const preparePreview = useCallback(
    (command: string) => resolvePreview(previewVoiceCommand(command, { pathname })),
    [pathname, resolvePreview],
  );

  const processCommand = useCallback(
    (command: string) => {
      const clean = command.trim();
      if (!clean) return;
      setText(clean);
      setHeard(clean);
      setExecutionError(null);

      const next = preparePreview(clean);
      if (canExecuteVoicePreview(next) && isNavigationOnly(next)) {
        const href = primaryHrefForVoicePlan(next.plan);
        if (href) {
          router.push(href);
          setPreview(null);
          return;
        }
      }
      setPreview(next);
    },
    [preparePreview, router],
  );

  const interpret = useCallback(() => {
    if (!text.trim()) return;
    processCommand(text);
  }, [processCommand, text]);

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

  const clearSpeechTimers = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (speechStartTimerRef.current) {
      clearTimeout(speechStartTimerRef.current);
      speechStartTimerRef.current = null;
    }
  }, []);

  const cleanupRecorder = useCallback(() => {
    if (recorderTimerRef.current) {
      clearTimeout(recorderTimerRef.current);
      recorderTimerRef.current = null;
    }
    recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
    recorderStreamRef.current = null;
    recorderRef.current = null;
    recorderChunksRef.current = [];
  }, []);

  const transcribeRecordedAudio = useCallback(
    async (blob: Blob) => {
      setExecuting(true);
      setExecutionError(null);
      try {
        const form = new FormData();
        const extension = blob.type.includes("ogg") ? "ogg" : "webm";
        form.set("audio", new File([blob], `denty-voice.${extension}`, { type: blob.type }));
        const response = await fetch("/api/voice/transcribe", {
          method: "POST",
          body: form,
          credentials: "same-origin",
        });
        const payload = (await response.json().catch(() => null)) as {
          text?: unknown;
          error?: { message?: unknown };
        } | null;
        if (!response.ok) {
          const message =
            typeof payload?.error?.message === "string"
              ? payload.error.message
              : "No se pudo transcribir la grabación.";
          throw new Error(message);
        }
        const transcript = typeof payload?.text === "string" ? payload.text.trim() : "";
        if (!transcript) throw new Error("No se ha detectado una orden de voz.");
        processCommand(transcript);
      } catch (error) {
        setExecutionError(
          error instanceof Error ? error.message : "No se pudo transcribir la grabación.",
        );
      } finally {
        setExecuting(false);
      }
    },
    [processCommand],
  );

  const startRecordedFallback = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setExecutionError("Este navegador no admite voz.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderStreamRef.current = stream;
      const mimeType = bestRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorderChunksRef.current = [];
      keepListeningRef.current = true;
      setVoiceEngine("recording");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recorderChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        keepListeningRef.current = false;
        setListening(false);
        setVoiceEngine(null);
        cleanupRecorder();
        setExecutionError("No se pudo grabar el audio del micrófono.");
      };
      recorder.onstart = () => setListening(true);
      recorder.onstop = () => {
        const chunks = recorderChunksRef.current;
        const type = recorder.mimeType || mimeType || "audio/webm";
        keepListeningRef.current = false;
        setListening(false);
        setVoiceEngine(null);
        const blob = new Blob(chunks, { type });
        cleanupRecorder();
        if (blob.size > 0) void transcribeRecordedAudio(blob);
        else setExecutionError("No se grabó audio. Inténtalo de nuevo.");
      };

      recorder.start(250);
      recorderTimerRef.current = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 7_000);
    } catch (error) {
      keepListeningRef.current = false;
      setListening(false);
      setVoiceEngine(null);
      cleanupRecorder();
      setExecutionError(error instanceof Error ? error.message : "No se pudo abrir el micrófono.");
    }
  }, [cleanupRecorder, transcribeRecordedAudio]);

  const stopListening = useCallback(() => {
    keepListeningRef.current = false;
    clearSpeechTimers();

    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      if (recorderTimerRef.current) {
        clearTimeout(recorderTimerRef.current);
        recorderTimerRef.current = null;
      }
      recorder.stop();
      return;
    }

    try {
      recognitionRef.current?.stop();
    } catch {
      // Some engines throw when stop() is called between sessions.
    }
    setListening(false);
    setVoiceEngine(null);
  }, [clearSpeechTimers]);

  const listen = useCallback(async () => {
    if (keepListeningRef.current || listening) {
      stopListening();
      return;
    }

    setExecutionError(null);
    setHeard(null);
    try {
      await requestMediaPermission("microphone");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setExecutionError(
        name === "NotAllowedError"
          ? speechErrorMessage("not-allowed")
          : error instanceof Error
            ? error.message
            : "No se pudo acceder al micrófono.",
      );
      return;
    }

    const speechWindow = window as WindowWithSpeech;
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      await startRecordedFallback();
      return;
    }

    const recognition = new Constructor();
    recognitionRef.current = recognition;
    keepListeningRef.current = true;
    speechStartedRef.current = false;
    setVoiceEngine("web-speech");
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      speechStartedRef.current = true;
      if (speechStartTimerRef.current) {
        clearTimeout(speechStartTimerRef.current);
        speechStartTimerRef.current = null;
      }
      setListening(true);
    };
    recognition.onresult = (event) => {
      const start = event.resultIndex ?? 0;
      for (let index = start; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript?.trim();
        if (!transcript || result?.isFinal === false) continue;
        processCommand(transcript);
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      const canFallback = event.error === "network" || event.error === "service-not-allowed";
      keepListeningRef.current = false;
      setListening(false);
      setVoiceEngine(null);
      clearSpeechTimers();
      if (canFallback) {
        try {
          recognition.abort();
        } catch {
          // Ignore browser engine teardown errors.
        }
        void startRecordedFallback();
        return;
      }
      setExecutionError(speechErrorMessage(event.error));
    };
    recognition.onend = () => {
      setListening(false);
      if (!keepListeningRef.current) {
        setVoiceEngine(null);
        return;
      }
      restartTimerRef.current = setTimeout(() => {
        if (!keepListeningRef.current) return;
        try {
          recognition.start();
        } catch {
          keepListeningRef.current = false;
          setListening(false);
          setVoiceEngine(null);
        }
      }, 250);
    };

    try {
      recognition.start();
      speechStartTimerRef.current = setTimeout(() => {
        if (speechStartedRef.current || !keepListeningRef.current) return;
        keepListeningRef.current = false;
        try {
          recognition.abort();
        } catch {
          // Some Chromium derivatives expose the API but never start it.
        }
        setListening(false);
        setVoiceEngine(null);
        void startRecordedFallback();
      }, 1_800);
    } catch {
      keepListeningRef.current = false;
      setListening(false);
      setVoiceEngine(null);
      clearSpeechTimers();
      await startRecordedFallback();
    }
  }, [clearSpeechTimers, listening, processCommand, startRecordedFallback, stopListening]);

  useEffect(() => {
    return () => {
      keepListeningRef.current = false;
      clearSpeechTimers();
      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignore teardown errors from browser recognition engines.
      }
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        try {
          recorder.stop();
        } catch {
          // Ignore teardown errors.
        }
      }
      cleanupRecorder();
    };
  }, [cleanupRecorder, clearSpeechTimers]);

  const listeningLabel =
    voiceEngine === "recording"
      ? "Grabando orden… pulsa de nuevo para enviar"
      : "Escuchando… di «Oye Denty…»";

  return (
    <>
      <Group gap={4} wrap="nowrap">
        <Tooltip
          label={
            listening
              ? listeningLabel
              : executionError
                ? executionError
                : heard
                  ? `Último: ${heard}`
                  : "Oye Denty · activar voz"
          }
          multiline
          maw={320}
        >
          <div
            className={motionStyles.voiceAction}
            data-state={listening ? "listening" : executing ? "executing" : "idle"}
          >
            <AnimatePresence>
              {listening && !reducedMotion
                ? [0, 1].map((pulse) => (
                    <motion.span
                      className={motionStyles.voicePulse}
                      key={pulse}
                      initial={{ opacity: 0.42, scale: 0.88 }}
                      animate={{ opacity: 0, scale: 1.55 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 1.35,
                        delay: pulse * 0.5,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                      aria-hidden="true"
                    />
                  ))
                : null}
            </AnimatePresence>
            <motion.div
              className={motionStyles.voiceButtonLayer}
              animate={
                reducedMotion
                  ? { scale: 1, rotate: 0 }
                  : listening
                    ? { scale: [1, 1.035, 1] }
                    : executing
                      ? { rotate: [0, 7, -7, 0] }
                      : { scale: 1, rotate: 0 }
              }
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : listening
                    ? { duration: 1.25, repeat: Infinity, ease: "easeInOut" }
                    : { type: "spring", stiffness: 380, damping: 28 }
              }
            >
              <ActionIcon
                size="lg"
                radius="xl"
                color={listening || executionError ? "red" : "gray"}
                variant={listening ? "filled" : "subtle"}
                aria-label={listening ? "Detener escucha" : "Escuchar comando"}
                onClick={() => void listen()}
                loading={executing && voiceEngine === null && !preview}
              >
                {listening ? <IconMicrophoneOff size={18} /> : <IconMicrophone size={18} />}
              </ActionIcon>
            </motion.div>
          </div>
        </Tooltip>

        <Popover
          opened={commandOpened}
          onChange={setCommandOpened}
          position="bottom-end"
          offset={10}
          shadow="md"
          radius="lg"
          width={320}
          withinPortal
        >
          <Popover.Target>
            <Tooltip label="Escribir una orden">
              <ActionIcon
                size="lg"
                radius="xl"
                variant="subtle"
                color={executionError ? "red" : "gray"}
                aria-label="Escribir comando para Denty"
                onClick={() => setCommandOpened((opened) => !opened)}
              >
                <IconSparkles size={18} />
              </ActionIcon>
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="sm">
              <div>
                <Text fw={750} size="sm">
                  Oye Denty
                </Text>
                <Text size="xs" c="dimmed">
                  Voz o texto, la misma inteligencia clínica.
                </Text>
              </div>
              <TextInput
                autoFocus
                value={text}
                onChange={(event) => setText(event.currentTarget.value)}
                placeholder="Abre el paciente Juan Pérez…"
                aria-label="Comando para Denty"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    interpret();
                    setCommandOpened(false);
                  }
                }}
              />
              {executionError && !preview ? (
                <Text size="xs" c="red">
                  {executionError}
                </Text>
              ) : heard ? (
                <Text size="xs" c="dimmed" lineClamp={2}>
                  Último: {heard}
                </Text>
              ) : null}
              <Group justify="space-between" wrap="nowrap">
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconMicrophone size={15} />}
                  onClick={() => void listen()}
                >
                  {listening ? "Detener" : "Hablar"}
                </Button>
                <Button
                  size="xs"
                  disabled={!text.trim()}
                  onClick={() => {
                    interpret();
                    setCommandOpened(false);
                  }}
                >
                  Ejecutar
                </Button>
              </Group>
            </Stack>
          </Popover.Dropdown>
        </Popover>
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
                {preview.plan.contextPatientId ? (
                  <Badge color="teal">Paciente resuelto</Badge>
                ) : null}
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
              Las órdenes de navegación se ejecutan directamente. Cobros, ausencias y actos clínicos
              realizados siguen requiriendo confirmación explícita.
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
