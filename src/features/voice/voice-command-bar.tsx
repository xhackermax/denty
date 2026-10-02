"use client";

import { ActionIcon, Popover, Tooltip } from "@mantine/core";
import { IconMicrophone, IconMicrophoneOff, IconSparkles } from "@tabler/icons-react";
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

import {
  appendDictation,
  deriveVoiceStatus,
  isAndroidUserAgent,
  stripWakePhrase,
  type CaptureStatus,
} from "./command-input";
import type { LocalVoiceAction } from "./local-nlu";
import { createTranscriptAssembler, type TranscriptAssembler } from "./transcript-assembler";
import {
  VoiceCommandPanel,
  type VoicePanelMessage,
  type VoicePatientChoices,
} from "./voice-command-panel";
import type { VoicePatientCandidate } from "./voice-patient-resolver";
import { decidePatient, patientQueryOf, withPatient } from "./voice-patient-resolution";
import { searchVoicePatients } from "./voice-patient-search";
import { buildVoicePreviewView } from "./voice-preview-view";
import {
  canExecuteVoicePreview,
  previewFromClaude,
  previewVoiceCommand,
  primaryHrefForVoicePlan,
  isLiteralNoteFallback,
  type VoicePreview,
} from "./voice-router";
import { VoiceTimeoutError, withTimeout } from "./with-timeout";
import {
  createBrowserDeepgramDeps,
  isDeepgramCaptureSupported,
} from "./dictation/browser-deepgram";
import {
  DictationError,
  startDeepgramDictation,
  type DictationSession,
} from "./dictation/deepgram-dictation";

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

type CaptureEngine = "deepgram" | "web-speech" | "recording" | null;

const CLAUDE_INTERPRET_TIMEOUT_MS = 12_000;
const PATIENT_SEARCH_PAGE_SIZE = 20;
const SEARCH_INTENT = /^\s*(?:oye\s+denty[\s,]*)?(?:busca|buscar|buscame|encuentra|localiza)\b/i;

function patientName(patient: VoicePatientCandidate): string {
  const name = `${patient.firstName} ${patient.lastName}`.trim();
  return patient.recordNumber ? `${name} · ficha ${patient.recordNumber}` : name;
}

interface PendingPatientChoice {
  choices: VoicePatientChoices;
  navigate: boolean;
  preview: VoicePreview;
}
const MAX_RECORDING_MS = 15_000;
const SPEECH_START_TIMEOUT_MS = 1_800;
const FINALIZE_TIMEOUT_MS = 2_500;

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

function bestRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return options.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
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
  return call ? `No puedo ejecutar ${call.name} todavía.` : "No se pudo ejecutar la orden.";
}

/** Web Speech resends the whole session on every event, so it is rebuilt each time. */
function sessionFromResults(results: ArrayLike<SpeechRecognitionResultLike>) {
  const finals: string[] = [];
  let interim = "";
  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    const transcript = result?.[0]?.transcript?.trim();
    if (!transcript) continue;
    if (result?.isFinal === false) interim = appendDictation(interim, transcript);
    else finals.push(transcript);
  }
  if (finals[0] !== undefined) finals[0] = stripWakePhrase(finals[0]);
  else interim = stripWakePhrase(interim);
  return { finals, interim };
}

export function shouldRenderVoiceControls(role: string | null | undefined) {
  // Agenda loading must not hide voice once the authenticated clinic role is known.
  return isInternalVoiceRole(role);
}

export function VoiceCommandBar() {
  const { role, permissions } = useActiveTenant();
  if (!shouldRenderVoiceControls(role)) return null;
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

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const textRef = useRef("");
  const [panelOpened, setPanelOpened] = useState(false);
  const [preview, setPreview] = useState<VoicePreview | null>(null);
  const [capture, setCapture] = useState<CaptureStatus>("idle");
  const [captureEngine, setCaptureEngine] = useState<CaptureEngine>(null);
  const [interpreting, setInterpreting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDone, setLastDone] = useState<string | null>(null);
  const [keyboardDictationHint, setKeyboardDictationHint] = useState(false);
  const executingRef = useRef(false);
  // Turned off for the session once the server says Claude isn't configured.
  const claudeAvailableRef = useRef(true);
  // Interpretations run one at a time so a second tap can't interleave with the first.
  const commandQueueRef = useRef<Promise<void>>(Promise.resolve());

  const updateText = useCallback((next: string) => {
    textRef.current = next;
    setText(next);
  }, []);

  useEffect(() => {
    setKeyboardDictationHint(isAndroidUserAgent(navigator.userAgent));
  }, []);

  const applyAssistantEffect = useCallback(
    (effect: AssistantExecutionEffect) => {
      if (effect.type === "NAVIGATE") router.push(effect.href);
      if (effect.type === "SELECT_TOOTH") patchAssistantContext({ selectedTooth: effect.tooth });
    },
    [patchAssistantContext, router],
  );

  // The first page the app keeps cached; names are always confirmed against the server.
  const cachedPatients = useMemo<readonly VoicePatientCandidate[]>(() => {
    return (patientsQuery.data?.items ?? []).map((patient) => ({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      ...(patient.recordNumber ? { recordNumber: patient.recordNumber } : {}),
    }));
  }, [patientsQuery.data]);
  const patientLabelsRef = useRef(new Map<string, string>());
  const rememberPatients = useCallback((list: readonly VoicePatientCandidate[]) => {
    for (const patient of list) patientLabelsRef.current.set(patient.id, patientName(patient));
  }, []);
  useEffect(() => rememberPatients(cachedPatients), [cachedPatients, rememberPatients]);

  const patientLabel = useCallback(
    (patientId: string) => patientLabelsRef.current.get(patientId) ?? "Paciente abierto",
    [],
  );

  const ensurePatientLabel = useCallback(
    async (patientId: string | undefined) => {
      if (!patientId || patientLabelsRef.current.has(patientId)) return;
      const patient = await getBrowserApi()
        .patients.get(patientId)
        .catch(() => null);
      if (patient) rememberPatients([patient]);
    },
    [rememberPatients],
  );

  const findPatients = useCallback(
    async (query: string): Promise<readonly VoicePatientCandidate[]> => {
      try {
        const found = await searchVoicePatients(query, async (term) => {
          const page = await getBrowserApi().patients.list({
            search: term,
            pageSize: PATIENT_SEARCH_PAGE_SIZE,
          });
          return page.items.map((patient) => ({
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            ...(patient.recordNumber ? { recordNumber: patient.recordNumber } : {}),
          }));
        });
        rememberPatients(found);
        return found;
      } catch {
        // Offline or failing search: the cached page is better than nothing, and
        // anything uncertain still ends in a choice or a confirmation.
        return cachedPatients;
      }
    },
    [cachedPatients, rememberPatients],
  );

  const [patientChoice, setPatientChoice] = useState<PendingPatientChoice | null>(null);

  const executeConfirmedPreview = useCallback(
    async (next: VoicePreview) => {
      if (executingRef.current || !canExecuteVoicePreview(next)) return;
      const adaptation = localVoicePlanToToolCalls(next.plan);
      if (adaptation.unsupported.length) {
        setError(
          `Denty ha entendido la orden, pero todavía no puede ejecutar: ${adaptation.unsupported.join(
            ", ",
          )}.`,
        );
        return;
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
        setError(policyMessage(blocked.result, blocked.call));
        return;
      }

      executingRef.current = true;
      setExecuting(true);
      setError(null);
      try {
        const result = await executeAssistantCalls(adaptation.calls, {
          // The person has just read the preview and pressed Confirmar.
          confirmedCallIds: new Set(
            policyResults
              .filter(({ result: policy }) => policy.decision === "CONFIRM")
              .map(({ call }) => call.id),
          ),
        });
        if (result.pendingConfirmation) {
          setError("Esta acción necesita confirmación explícita.");
          return;
        }
        for (const effect of result.effects) applyAssistantEffect(effect);
        // Refreshing every screen can be slow; the change is already saved.
        void queryClient.invalidateQueries();
        setPreview(null);
        updateText("");
        setLastDone(next.plan.readback);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo ejecutar la orden.");
      } finally {
        executingRef.current = false;
        setExecuting(false);
      }
    },
    [applyAssistantEffect, permissions, queryClient, role, updateText],
  );

  const showInterpretation = useCallback(
    async (next: VoicePreview) => {
      if (canExecuteVoicePreview(next) && isNavigationOnly(next)) {
        const href = primaryHrefForVoicePlan(next.plan);
        if (href) {
          router.push(href);
          setLastDone(next.plan.readback);
          updateText("");
          return;
        }
      }
      if (!next.plan.actions.length) {
        setError("No he entendido una acción concreta. Revisa el texto o concreta la instrucción.");
        return;
      }
      await ensurePatientLabel(next.plan.contextPatientId);
      setPreview(next);
    },
    [ensurePatientLabel, router, updateText],
  );

  /** Settles who the order is for; false when it already ended in a choice or an error. */
  const settlePatient = useCallback(
    async (base: VoicePreview, raw: string): Promise<VoicePreview | null> => {
      const query = patientQueryOf(base);
      if (!query) return base;
      const candidates = await findPatients(query);
      const decision = decidePatient(base, candidates, { search: SEARCH_INTENT.test(raw) });
      if (decision.kind === "preview") return decision.preview;
      if (decision.kind === "not_found") {
        setError(
          `No encuentro al paciente «${decision.query}». Revisa el nombre o el número de ficha.`,
        );
        return null;
      }
      setPatientChoice({
        navigate: decision.navigate,
        preview: decision.preview,
        choices: {
          title: `Pacientes que coinciden con «${decision.query}»`,
          verb: decision.navigate ? "Abrir" : "Elegir",
          options: decision.options.map((option) => ({
            id: option.id,
            label: patientLabelsRef.current.get(option.id) ?? option.label,
          })),
        },
      });
      return null;
    },
    [findPatients],
  );

  const runCommand = useCallback(
    async (command: string) => {
      const clean = command.trim();
      if (!clean) return;
      setError(null);
      setLastDone(null);
      setPreview(null);
      setPatientChoice(null);

      const rules = previewVoiceCommand(clean, { pathname, ...assistantContext });
      if (rules.plan.invalidTeeth?.length) {
        // A wrong tooth number is a dictation slip; nobody should guess the right one.
        setError(`No he guardado nada: ${rules.plan.ambiguities.join("; ")}.`);
        return;
      }
      setInterpreting(true);
      try {
        const local = await settlePatient(rules, clean);
        if (!local) return;

        // The local rules are free: when they fully understood the order, Claude
        // isn't called. Claude (paid per call) handles only what they can't, and
        // the rules stay as the fallback when it isn't configured or doesn't answer.
        if (
          claudeAvailableRef.current &&
          (!canExecuteVoicePreview(local) || isLiteralNoteFallback(local))
        ) {
          try {
            const result = await withTimeout(
              getBrowserApi().voice.interpret({ text: clean, pathname }),
              CLAUDE_INTERPRET_TIMEOUT_MS,
            );
            const fromClaude = await settlePatient(
              previewFromClaude(
                clean,
                { actions: result.actions as LocalVoiceAction[], ambiguities: result.ambiguities },
                { pathname, ...assistantContext },
              ),
              clean,
            );
            if (fromClaude) await showInterpretation(fromClaude);
            return;
          } catch (cause) {
            if (cause instanceof DentyApiError && cause.code === "VOICE_AI_NOT_CONFIGURED") {
              claudeAvailableRef.current = false;
            } else if (cause instanceof VoiceTimeoutError) {
              setError("La IA tardó demasiado; te muestro lo que entendí en local.");
            } else if (cause instanceof DentyApiError && cause.code === "VOICE_AI_DECLINED") {
              setError(cause.message);
            }
          }
        }
        await showInterpretation(local);
      } finally {
        setInterpreting(false);
      }
    },
    [assistantContext, pathname, settlePatient, showInterpretation],
  );

  const choosePatient = useCallback(
    (patientId: string) => {
      const pending = patientChoice;
      if (!pending) return;
      setPatientChoice(null);
      if (pending.navigate) {
        router.push(`/app/patients/${encodeURIComponent(patientId)}`);
        setLastDone(`Abriendo la ficha de ${patientLabel(patientId)}.`);
        updateText("");
        return;
      }
      setPreview(withPatient(pending.preview, patientId));
    },
    [patientChoice, patientLabel, router, updateText],
  );

  const interpret = useCallback(() => {
    // Android keyboards can update the DOM value after the last change event.
    const value = inputRef.current?.value ?? textRef.current;
    if (!value.trim()) return;
    if (value !== textRef.current) updateText(value);
    const run = commandQueueRef.current.then(
      () => runCommand(value),
      () => runCommand(value),
    );
    commandQueueRef.current = run.catch(() => undefined);
  }, [runCommand, updateText]);

  const clear = useCallback(() => {
    updateText("");
    setPreview(null);
    setPatientChoice(null);
    setError(null);
    setLastDone(null);
  }, [updateText]);

  // ---- Audio capture -------------------------------------------------------

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const deepgramSessionRef = useRef<DictationSession | null>(null);
  // Set while a Deepgram session is still opening, so Detener or leaving can reach it.
  const deepgramOpeningRef = useRef<{ stop: boolean; cancel: boolean } | null>(null);
  // Off for the rest of the visit once Deepgram turns out unconfigured or unsupported.
  const deepgramUsableRef = useRef(true);
  const keepListeningRef = useRef(false);
  const assemblerRef = useRef<TranscriptAssembler | null>(null);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const recorderChunksRef = useRef<BlobPart[]>([]);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
  }, []);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) clearTimeout(timer);
    timersRef.current.clear();
  }, []);

  const finishCapture = useCallback(() => {
    keepListeningRef.current = false;
    clearTimers();
    recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
    recorderStreamRef.current = null;
    recorderRef.current = null;
    recorderChunksRef.current = [];
    recognitionRef.current = null;
    assemblerRef.current = null;
    setCapture("idle");
    setCaptureEngine(null);
  }, [clearTimers]);

  const transcribeRecording = useCallback(
    async (blob: Blob) => {
      try {
        const form = new FormData();
        const extension = blob.type.includes("ogg")
          ? "ogg"
          : blob.type.includes("mp4")
            ? "mp4"
            : "webm";
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
          throw new Error(
            typeof payload?.error?.message === "string"
              ? payload.error.message
              : "No se pudo transcribir la grabación.",
          );
        }
        const transcript = typeof payload?.text === "string" ? stripWakePhrase(payload.text) : "";
        if (!transcript) throw new Error("No se ha detectado voz reconocible.");
        updateText(appendDictation(textRef.current, transcript));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo transcribir la grabación.");
      } finally {
        finishCapture();
      }
    },
    [finishCapture, updateText],
  );

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador no permite grabar audio. Usa el teclado o el dictado del teclado.");
      finishCapture();
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
      setCaptureEngine("recording");
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recorderChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError("No se pudo grabar el audio del micrófono.");
        finishCapture();
      };
      recorder.onstart = () => setCapture("listening");
      recorder.onstop = () => {
        const blob = new Blob(recorderChunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
        if (blob.size === 0) {
          setError("No se grabó audio. Inténtalo de nuevo.");
          finishCapture();
          return;
        }
        setCapture("finalizing");
        void transcribeRecording(blob);
      };
      recorder.start(250);
      schedule(() => {
        if (recorder.state === "recording") recorder.stop();
      }, MAX_RECORDING_MS);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo abrir el micrófono.");
      finishCapture();
    }
  }, [finishCapture, schedule, transcribeRecording]);

  const stopCapture = useCallback(() => {
    keepListeningRef.current = false;
    if (deepgramSessionRef.current) {
      deepgramSessionRef.current.stop();
      return;
    }
    if (deepgramOpeningRef.current) {
      deepgramOpeningRef.current.stop = true;
      setCapture("finalizing");
      return;
    }
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.stop();
      return;
    }
    const recognition = recognitionRef.current;
    if (!recognition) {
      finishCapture();
      return;
    }
    setCapture("finalizing");
    // If the engine never reports the end, release the microphone anyway.
    schedule(() => {
      try {
        recognition.abort();
      } catch {
        // Some engines throw when aborting a session that already ended.
      }
      if (assemblerRef.current) updateText(assemblerRef.current.text());
      finishCapture();
    }, FINALIZE_TIMEOUT_MS);
    try {
      recognition.stop();
    } catch {
      finishCapture();
    }
  }, [finishCapture, schedule, updateText]);

  /** Resolves false when Deepgram can't be used here and another engine should take over. */
  const startDeepgram = useCallback(async (): Promise<boolean> => {
    const assembler = createTranscriptAssembler(textRef.current);
    assemblerRef.current = assembler;
    let firstSegment = true;
    let failed = false;
    const spoken = (text: string) => (firstSegment ? stripWakePhrase(text) : text);
    setCaptureEngine("deepgram");
    const opening = { stop: false, cancel: false };
    deepgramOpeningRef.current = opening;
    try {
      const session = await startDeepgramDictation(createBrowserDeepgramDeps(), {
        onStatus: setCapture,
        onInterim: (text) => {
          assembler.setInterim(spoken(text));
          updateText(assembler.text());
        },
        onFinal: (text) => {
          assembler.commitFinal(spoken(text));
          firstSegment = false;
          updateText(assembler.text());
        },
        onError: (dictationError) => {
          failed = true;
          setError(dictationError.message);
        },
        onEnd: ({ graceful, heardSpeech }) => {
          // A clean finish already turned every partial into a final segment.
          updateText(graceful ? assembler.finalText() : assembler.text());
          if (!heardSpeech && !failed) setError("No se ha detectado voz reconocible.");
          deepgramSessionRef.current = null;
          finishCapture();
        },
      });
      deepgramOpeningRef.current = null;
      if (opening.cancel) {
        session.cancel();
        return true;
      }
      deepgramSessionRef.current = session;
      if (opening.stop) session.stop();
      return true;
    } catch (cause) {
      deepgramOpeningRef.current = null;
      deepgramSessionRef.current = null;
      if (opening.cancel) return true;
      if (opening.stop) {
        // The person already pressed Detener: never fall back to another engine.
        finishCapture();
        return true;
      }
      if (
        cause instanceof DictationError &&
        (cause.code === "NOT_CONFIGURED" || cause.code === "UNSUPPORTED")
      ) {
        deepgramUsableRef.current = false;
        return false;
      }
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar el dictado.");
      finishCapture();
      return true;
    }
  }, [finishCapture, updateText]);

  const startCapture = useCallback(async () => {
    setPanelOpened(true);
    setError(null);
    setLastDone(null);
    setPreview(null);
    setCapture("requesting_permission");
    try {
      await requestMediaPermission("microphone");
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      setError(
        name === "NotAllowedError"
          ? speechErrorMessage("not-allowed")
          : cause instanceof Error
            ? cause.message
            : "No se pudo acceder al micrófono.",
      );
      finishCapture();
      return;
    }

    setCapture("connecting");
    if (deepgramUsableRef.current && isDeepgramCaptureSupported() && (await startDeepgram())) {
      return;
    }

    const speechWindow = window as WindowWithSpeech;
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      await startRecording();
      return;
    }

    const recognition = new Constructor();
    recognitionRef.current = recognition;
    keepListeningRef.current = true;
    assemblerRef.current = createTranscriptAssembler(textRef.current);
    let started = false;
    setCaptureEngine("web-speech");
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      started = true;
      setCapture("listening");
    };
    recognition.onresult = (event) => {
      const assembler = assemblerRef.current;
      if (!assembler) return;
      const { finals, interim } = sessionFromResults(event.results);
      assembler.replaceSession(finals, interim);
      updateText(assembler.text());
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      const canFallback = event.error === "network" || event.error === "service-not-allowed";
      keepListeningRef.current = false;
      try {
        recognition.abort();
      } catch {
        // Ignore browser engine teardown errors.
      }
      if (canFallback) {
        recognitionRef.current = null;
        void startRecording();
        return;
      }
      setError(speechErrorMessage(event.error));
      finishCapture();
    };
    recognition.onend = () => {
      const assembler = assemblerRef.current;
      if (recognitionRef.current !== recognition) return;
      if (!keepListeningRef.current) {
        if (assembler) updateText(assembler.text());
        finishCapture();
        return;
      }
      // Engines end sessions on silence; a new session starts with what was already dictated.
      assemblerRef.current = createTranscriptAssembler(assembler?.text() ?? textRef.current);
      schedule(() => {
        if (!keepListeningRef.current) return;
        try {
          recognition.start();
        } catch {
          finishCapture();
        }
      }, 250);
    };

    try {
      recognition.start();
      schedule(() => {
        if (started || !keepListeningRef.current) return;
        // Some Chromium derivatives expose the API but never start it.
        keepListeningRef.current = false;
        try {
          recognition.abort();
        } catch {
          // Ignore teardown errors.
        }
        recognitionRef.current = null;
        void startRecording();
      }, SPEECH_START_TIMEOUT_MS);
    } catch {
      recognitionRef.current = null;
      await startRecording();
    }
  }, [finishCapture, schedule, startDeepgram, startRecording, updateText]);

  const toggleCapture = useCallback(() => {
    if (capture === "finalizing" || capture === "requesting_permission") return;
    if (capture !== "idle") {
      stopCapture();
      return;
    }
    startCapture().catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Error inesperado al iniciar la voz.");
      finishCapture();
    });
  }, [capture, finishCapture, startCapture, stopCapture]);

  // Leaving the page must release the microphone.
  const capturePathRef = useRef(pathname);
  useEffect(() => {
    if (capturePathRef.current === pathname) return;
    capturePathRef.current = pathname;
    if (
      deepgramSessionRef.current ||
      deepgramOpeningRef.current ||
      keepListeningRef.current ||
      recorderRef.current
    ) {
      stopCapture();
    }
  }, [pathname, stopCapture]);

  useEffect(() => {
    return () => {
      keepListeningRef.current = false;
      deepgramSessionRef.current?.cancel();
      if (deepgramOpeningRef.current) deepgramOpeningRef.current.cancel = true;
      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignore teardown errors from browser recognition engines.
      }
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        recorder.onstop = null;
        recorder.stop();
      }
      recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
      for (const timer of timersRef.current) clearTimeout(timer);
    };
  }, []);

  // ---- View ----------------------------------------------------------------

  const listening = capture !== "idle";
  const status = deriveVoiceStatus({
    capture,
    interpreting,
    executing,
    awaitingConfirmation: preview !== null,
    done: lastDone !== null,
    error: error !== null,
  });
  const previewView = useMemo(
    () => (preview ? buildVoicePreviewView(preview, patientLabel) : null),
    [patientLabel, preview],
  );
  const message: VoicePanelMessage | null = error
    ? { tone: "error", text: error }
    : lastDone
      ? { tone: "done", text: `Hecho: ${lastDone}` }
      : null;
  const headerHint = listening
    ? captureEngine === "recording"
      ? "Grabando… pulsa de nuevo para terminar"
      : "Escuchando… pulsa de nuevo para terminar"
    : (error ?? "Dictar una instrucción");

  return (
    <div className={motionStyles.voiceBar}>
      <Tooltip label={headerHint} multiline maw={320}>
        <div
          className={motionStyles.voiceAction}
          data-state={listening ? "listening" : executing ? "executing" : "idle"}
        >
          <AnimatePresence>
            {capture === "listening" && !reducedMotion
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
          <div className={motionStyles.voiceButtonLayer}>
            <ActionIcon
              size="lg"
              radius="xl"
              color={listening || error ? "red" : "gray"}
              variant={listening ? "filled" : "subtle"}
              aria-label={listening ? "Detener escucha" : "Escuchar comando"}
              onClick={toggleCapture}
              loading={capture === "finalizing" || capture === "requesting_permission"}
            >
              {listening ? <IconMicrophoneOff size={18} /> : <IconMicrophone size={18} />}
            </ActionIcon>
          </div>
        </div>
      </Tooltip>

      <Popover
        opened={panelOpened}
        onChange={setPanelOpened}
        position="bottom-end"
        offset={10}
        shadow="md"
        radius="lg"
        width="min(380px, calc(100vw - 32px))"
        closeOnClickOutside={!listening && !preview && !executing}
        closeOnEscape={!listening}
        withinPortal
      >
        <Popover.Target>
          <Tooltip label="Escribir o dictar una instrucción">
            <ActionIcon
              size="lg"
              radius="xl"
              variant="subtle"
              color={error ? "red" : "gray"}
              aria-label="Escribir comando para Denty"
              onClick={() => setPanelOpened((opened) => !opened)}
            >
              <IconSparkles size={18} />
            </ActionIcon>
          </Tooltip>
        </Popover.Target>
        <Popover.Dropdown>
          <VoiceCommandPanel
            inputRef={inputRef}
            text={text}
            onTextChange={updateText}
            status={status}
            listening={listening}
            microphoneDisabled={capture === "finalizing" || capture === "requesting_permission"}
            showKeyboardDictationHint={keyboardDictationHint}
            preview={previewView}
            patientChoices={patientChoice?.choices ?? null}
            message={message}
            onToggleMicrophone={toggleCapture}
            onInterpret={interpret}
            onClear={clear}
            onConfirm={() => {
              if (preview) void executeConfirmedPreview(preview);
            }}
            onCancelPreview={() => setPreview(null)}
            onChoosePatient={choosePatient}
          />
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
