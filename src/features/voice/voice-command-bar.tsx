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

import { useQueryClient } from "@tanstack/react-query";

import {
  useOptionalAssistantContext,
  useOptionalAssistantContextPatch,
} from "@/features/assistant/assistant-context";
import type { AssistantToolCall } from "@/features/assistant/assistant-types";
import {
  executeAssistantCalls,
  type AssistantExecutionEffect,
} from "@/features/assistant/tools/assistant-tool-executor";
import {
  evaluateAssistantCall,
  isInternalVoiceRole,
  type AssistantPolicyResult,
} from "@/features/assistant/tools/assistant-policy";
import { localVoicePlanToToolCalls } from "@/features/assistant/tools/local-voice-adapter";
import { getBrowserApi } from "@/shared/api/browser";
import { DentyApiError } from "@/shared/api/errors";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import { requestMediaPermission } from "@/shared/ui/device-permissions";

import motionStyles from "./voice-command-bar.module.css";

import { voiceReadback, type LocalVoiceAction } from "./local-nlu";
import {
  pickPatientOverride,
  resolveVoicePatient,
  type VoicePatientCandidate,
} from "./voice-patient-resolver";
import {
  canExecuteVoicePreview,
  previewFromClaude,
  previewVoiceCommand,
  primaryHrefForVoicePlan,
  isLiteralNoteFallback,
  shouldAutoExecuteSpokenPreview,
  type VoicePreview,
} from "./voice-router";
import { useRealtimeVoice } from "./use-realtime-voice";
import {
  VoiceRealtimeAdapter,
  selectVoiceEngine,
  type RealtimeVoiceConfig,
} from "./voice-realtime-adapter";
import { createSpeechCommandBuffer } from "./speech-command-buffer";
import { useLatestHandler } from "./use-latest-handler";
import { VoiceTimeoutError, withTimeout } from "./with-timeout";

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

const CLAUDE_INTERPRET_TIMEOUT_MS = 12_000;

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

function describeAction(action: LocalVoiceAction): string {
  const sentence = voiceReadback([action], [])
    .replace(/^Voy a /, "")
    .replace(/\.$/, "");
  return sentence === "No he detectado una acción concreta" ? action.type : sentence;
}

function policyMessage(result: AssistantPolicyResult, call?: AssistantToolCall): string {
  if (result.reason === "ROLE_NOT_ALLOWED") {
    return "La voz de Denty solo está disponible para administración y equipo de clínica.";
  }
  if (result.reason === "PATIENT_REQUIRED") {
    return "Necesito saber sobre qué paciente trabajar antes de ejecutar esta orden.";
  }
  if (result.reason === "UNKNOWN_TOOL") {
    return "Denty ha entendido la orden, pero esta acción todavía no está conectada.";
  }
  if (result.reason === "CONSEQUENTIAL_ACTION") {
    return "Esta acción modifica datos sensibles. Revisa y confirma antes de ejecutarla.";
  }
  return call ? `No puedo ejecutar ${call.name} todavía.` : "No se pudo ejecutar la orden.";
}

export function shouldRenderVoiceControls(role: string | null | undefined, loading: boolean) {
  return !loading && isInternalVoiceRole(role);
}

export function VoiceCommandBar() {
  const { role, permissions, loading } = useActiveTenant();
  if (!shouldRenderVoiceControls(role, loading)) return null;
  return <VoiceCommandBarInner permissions={permissions} role={role} />;
}

function VoiceCommandBarInner({
  permissions,
  role,
}: {
  permissions: readonly string[];
  role: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const assistantContext = useOptionalAssistantContext();
  const patchAssistantContext = useOptionalAssistantContextPatch();
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotion();
  const patientsQuery = usePatientsQuery();

  const [text, setText] = useState("");
  const [commandOpened, setCommandOpened] = useState(false);
  const [preview, setPreview] = useState<VoicePreview | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>(null);
  const [executing, setExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [interpreting, setInterpreting] = useState(false);
  const [lastDone, setLastDone] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<
    "connecting" | "listening" | "processing" | "idle" | "error"
  >("idle");
  // Turned off for the session once the server says Claude isn't configured.
  const claudeAvailableRef = useRef(true);
  const realtimeAdapterRef = useRef<VoiceRealtimeAdapter | null>(null);
  const speechCommandBufferRef = useRef(createSpeechCommandBuffer());
  // Commands run one at a time: overlapping speech must not interleave or execute twice.
  const commandQueueRef = useRef<Promise<void>>(Promise.resolve());
  const commandHandler = useLatestHandler<[string], Promise<void>>();
  const dispatchCommand = commandHandler.dispatch;
  const submitRealtimeToolResultRef = useRef<
    (toolCallId: string, result: { success: boolean; message?: string; error?: string }) => void
  >(() => undefined);

  const applyAssistantEffect = useCallback(
    (effect: AssistantExecutionEffect) => {
      if (effect.type === "NAVIGATE") router.push(effect.href);
      if (effect.type === "SELECT_TOOTH") patchAssistantContext({ selectedTooth: effect.tooth });
    },
    [patchAssistantContext, router],
  );

  const executeResolvedPreview = useCallback(
    async (next: VoicePreview, options: { confirmed?: boolean } = {}) => {
      if (!canExecuteVoicePreview(next)) return false;
      const adaptation = localVoicePlanToToolCalls(next.plan);
      if (adaptation.unsupported.length) {
        setPreview(next);
        setExecutionError(
          `Denty ha entendido la orden, pero todavía no puede ejecutar: ${adaptation.unsupported.join(
            ", ",
          )}.`,
        );
        return false;
      }

      const policyContext = {
        ...(next.plan.contextPatientId ? { patientId: next.plan.contextPatientId } : {}),
        role,
        permissions,
      };
      const policyResults = adaptation.calls.map((call) => ({
        call,
        result: evaluateAssistantCall(call, policyContext),
      }));
      const blocked = policyResults.find(({ result }) => result.decision === "BLOCK");
      if (blocked) {
        setPreview(next);
        setExecutionError(policyMessage(blocked.result, blocked.call));
        return false;
      }
      const confirmationCalls = policyResults
        .filter(({ result }) => result.decision === "CONFIRM")
        .map(({ call }) => call);
      if (confirmationCalls.length && !options.confirmed) {
        setPreview(next);
        setExecutionError(
          policyMessage({ decision: "CONFIRM", reason: "CONSEQUENTIAL_ACTION", risk: "RED" }),
        );
        return false;
      }

      setExecuting(true);
      setExecutionError(null);
      try {
        const result = await executeAssistantCalls(adaptation.calls, {
          confirmedCallIds: new Set(
            options.confirmed ? confirmationCalls.map((call) => call.id) : [],
          ),
        });
        if (result.pendingConfirmation) {
          setPreview(next);
          setExecutionError("Esta acción necesita confirmación explícita.");
          return false;
        }
        for (const effect of result.effects) applyAssistantEffect(effect);
        await queryClient.invalidateQueries();
        setPreview(null);
        setText("");
        setLastDone(next.plan.readback);
        return true;
      } catch (error) {
        setExecutionError(
          error instanceof Error ? error.message : "No se pudo ejecutar el plan de voz.",
        );
        return false;
      } finally {
        setExecuting(false);
      }
    },
    [applyAssistantEffect, permissions, queryClient, role],
  );

  // Realtime voice integration
  const {
    connected: realtimeConnected,
    listening: realtimeListening,
    error: realtimeError,
    connect: connectRealtime,
    disconnect: disconnectRealtime,
    submitToolResult,
  } = useRealtimeVoice({
    onText: () => {
      setVoiceStatus("processing");
    },
    onTranscript: (transcript) => {
      void dispatchCommand(transcript);
    },
    onError: (error) => {
      setVoiceStatus("error");
      setExecutionError(error);
    },
    onToolCall: (toolCall) => {
      void (async () => {
        try {
          const { processRealtimeToolCall } = await import("./realtime-tools");
          const interpretation = processRealtimeToolCall(toolCall);
          const next = resolvePreview(
            previewFromClaude(
              "Orden de voz en tiempo real",
              {
                actions: interpretation.actions,
                ambiguities: interpretation.ambiguities,
              },
              { pathname },
            ),
          );
          if (shouldAutoExecuteSpokenPreview(next)) {
            const executed = await executeResolvedPreview(next);
            submitRealtimeToolResultRef.current(
              toolCall.id,
              executed
                ? { success: true, message: "Accion guardada en Denty" }
                : { success: false, error: "No se pudo guardar la accion en Denty" },
            );
            return;
          }
          setPreview(next);
          submitRealtimeToolResultRef.current(toolCall.id, {
            success: false,
            error: next.plan.ambiguities.length
              ? next.plan.ambiguities.join("; ")
              : "La accion necesita confirmacion",
          });
        } catch (error) {
          submitRealtimeToolResultRef.current(toolCall.id, {
            success: false,
            error: error instanceof Error ? error.message : "No se pudo procesar la voz",
          });
        }
      })();
    },
  });

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
    return (patientsQuery.data?.items ?? []).map((patient) => ({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      ...(patient.recordNumber ? { recordNumber: patient.recordNumber } : {}),
    }));
  }, [patientsQuery.data]);

  const resolvePreview = useCallback(
    (base: VoicePreview): VoicePreview => {
      const query = patientQueryFromPreview(base);
      if (!query) return base;
      if (base.plan.contextPatientId) {
        const other = pickPatientOverride(query, base.plan.contextPatientId, patients);
        if (!other) return base;
        return { ...base, plan: { ...base.plan, contextPatientId: other.id } };
      }

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
    (command: string) =>
      resolvePreview(
        previewVoiceCommand(command, {
          pathname,
          ...assistantContext,
        }),
      ),
    [assistantContext, pathname, resolvePreview],
  );

  const runCommand = useCallback(
    async (command: string) => {
      const clean = command.trim();
      if (!clean) return;
      setText(clean);
      setHeard(clean);
      setExecutionError(null);
      setLastDone(null);

      const next = preparePreview(clean);
      if (canExecuteVoicePreview(next) && isNavigationOnly(next)) {
        const href = primaryHrefForVoicePlan(next.plan);
        if (href) {
          router.push(href);
          setPreview(null);
          return;
        }
      }

      // The local rules are free: when they fully understood the order, Claude
      // isn't called. Claude (paid per call) handles only what they can't, and
      // the rules stay as the fallback when it isn't configured or doesn't answer.
      if (
        claudeAvailableRef.current &&
        (!canExecuteVoicePreview(next) || isLiteralNoteFallback(next))
      ) {
        setInterpreting(true);
        try {
          const result = await withTimeout(
            getBrowserApi().voice.interpret({ text: clean, pathname }),
            CLAUDE_INTERPRET_TIMEOUT_MS,
          );
          const interpreted = resolvePreview(
            previewFromClaude(
              clean,
              { actions: result.actions as LocalVoiceAction[], ambiguities: result.ambiguities },
              {
                pathname,
                ...assistantContext,
              },
            ),
          );
          if (shouldAutoExecuteSpokenPreview(interpreted)) {
            await executeResolvedPreview(interpreted);
            return;
          }
          setPreview(interpreted);
          return;
        } catch (error) {
          if (error instanceof DentyApiError && error.code === "VOICE_AI_NOT_CONFIGURED") {
            claudeAvailableRef.current = false;
          } else if (error instanceof VoiceTimeoutError) {
            setExecutionError("La IA tardó demasiado; te muestro lo que entendí en local.");
          } else if (error instanceof DentyApiError && error.code === "VOICE_AI_DECLINED") {
            setExecutionError(error.message);
          }
        } finally {
          setInterpreting(false);
        }
      }
      if (shouldAutoExecuteSpokenPreview(next)) {
        await executeResolvedPreview(next);
        return;
      }
      setPreview(next);
    },
    [assistantContext, executeResolvedPreview, pathname, preparePreview, resolvePreview, router],
  );

  const processCommand = useCallback(
    (command: string): Promise<void> => {
      const run = commandQueueRef.current.then(
        () => runCommand(command),
        () => runCommand(command),
      );
      commandQueueRef.current = run.catch(() => undefined);
      return run;
    },
    [runCommand],
  );

  const bindCommandHandler = commandHandler.bind;
  useEffect(() => {
    bindCommandHandler(processCommand);
  }, [bindCommandHandler, processCommand]);

  const interpret = useCallback(() => {
    if (!text.trim()) return;
    void processCommand(text);
  }, [processCommand, text]);

  // Initialize the adapter with tool calling support
  useEffect(() => {
    submitRealtimeToolResultRef.current = submitToolResult;
    const config: RealtimeVoiceConfig = {
      onTranscript: (text) => {
        void dispatchCommand(text);
      },
      onError: (error) => {
        setExecutionError(error);
      },
      onStatusChange: (status) => {
        setVoiceStatus(status);
      },
      submitToolResult: submitToolResult,
    };
    realtimeAdapterRef.current = new VoiceRealtimeAdapter(config);
  }, [dispatchCommand, submitToolResult]);

  const execute = async () => {
    if (!preview || !canExecuteVoicePreview(preview)) return;
    await executeResolvedPreview(preview, { confirmed: true });
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
        void dispatchCommand(transcript);
      } catch (error) {
        setExecutionError(
          error instanceof Error ? error.message : "No se pudo transcribir la grabación.",
        );
      } finally {
        setExecuting(false);
      }
    },
    [dispatchCommand],
  );

  const startRecordedFallback = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setExecutionError("Este navegador no admite voz.");
      setCommandOpened(true);
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
        setCommandOpened(true);
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
      const msg = error instanceof Error ? error.message : "No se pudo abrir el micrófono.";
      setExecutionError(msg);
      setCommandOpened(true);
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
    speechCommandBufferRef.current.clear();
    try {
      await requestMediaPermission("microphone");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      const msg =
        name === "NotAllowedError"
          ? speechErrorMessage("not-allowed")
          : error instanceof Error
            ? error.message
            : "No se pudo acceder al micrófono.";
      setExecutionError(msg);
      setCommandOpened(true);
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
        const command = speechCommandBufferRef.current.push(transcript);
        if (command) void dispatchCommand(command);
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
      setCommandOpened(true);
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
  }, [clearSpeechTimers, dispatchCommand, listening, startRecordedFallback, stopListening]);

  const safeListen = useCallback(() => {
    listen().catch((err) => {
      const msg = err instanceof Error ? err.message : "Error inesperado al iniciar la voz.";
      setExecutionError(msg);
      setCommandOpened(true);
    });
  }, [listen]);

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

  useEffect(() => {
    if (listening) setCommandOpened(true);
  }, [listening]);

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
                onClick={safeListen}
                loading={interpreting || (executing && voiceEngine === null && !preview)}
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
                placeholder="Abre un paciente por nombre o número de ficha…"
                aria-label="Comando para Denty"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    interpret();
                    setCommandOpened(false);
                  }
                }}
              />
              {listening ? (
                <Badge color="red" variant="light" size="sm" fullWidth>
                  {voiceEngine === "recording"
                    ? "Grabando… pulsa Detener para enviar"
                    : "Escuchando… di tu orden"}
                </Badge>
              ) : executionError && !preview ? (
                <Text size="xs" c="red">
                  {executionError}
                </Text>
              ) : lastDone ? (
                <Text size="xs" c="teal" lineClamp={3}>
                  Hecho: {lastDone}
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
                  onClick={safeListen}
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
                {preview.plan.source === "claude" ? (
                  <Badge color="violet" variant="light">
                    Claude
                  </Badge>
                ) : null}
              </Group>
            </div>

            {preview.plan.ambiguities.length ? (
              <Alert icon={<IconAlertCircle size={18} />} color="yellow" title="Faltan datos">
                {preview.plan.ambiguities.join(" · ")}
              </Alert>
            ) : null}

            {preview.unsupportedActions.length ? (
              <Alert
                icon={<IconAlertCircle size={18} />}
                color="yellow"
                title="Acción aún no ejecutable"
              >
                Denty ha entendido la orden, pero no la ejecutará hasta que estas acciones estén
                conectadas al mismo comando transaccional que la interfaz:{" "}
                {preview.unsupportedActions.join(" · ")}.
              </Alert>
            ) : null}

            <List size="sm" spacing="xs">
              {preview.plan.actions.map((action, index) => (
                <List.Item key={`${action.type}-${index}`}>{describeAction(action)}</List.Item>
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
