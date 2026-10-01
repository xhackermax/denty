"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Group, Select, Text, TextInput, Title } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { useMouthState } from "@/features/odontogram/mouth-state-context";
import { PERIODONTAL_SITES, type PeriodontalReading } from "@/domain/periodontal";
import { createPerioExam, examToReadings, perioSummary } from "@/domain/periodontal/exam";
import {
  applyPerioCommand,
  createPerioSession,
  reconcileSessionMouth,
  type PerioCommand,
  type PerioSession,
} from "@/domain/periodontal/entry-cursor";
import { parsePerioDictation } from "@/features/voice/perio-dictation";
import { useUnsavedChangesGuard } from "@/shared/navigation/use-unsaved-changes-guard";
import { getBrowserApi } from "@/shared/api/browser";
import { perioExamDataSchema, type PerioDraftData } from "@/shared/api/schemas/perio-drafts";
import { useClinicalWorkflowQuery } from "@/shared/clinical/clinical-data";
import { DraftWriter } from "./draft-writer";
import { registerPerioSession } from "./perio-voice-session";
import { PerioToothGraph } from "./perio-tooth-graph";
import { PerioSummaryBar } from "./perio-summary-bar";
import { PerioCompare } from "./perio-compare";
import { PerioPrint } from "./perio-print";
import styles from "./perio-chart.module.css";
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
interface Props {
  patientId: string;
  readOnly: boolean;
  active: boolean;
  readings?: readonly Partial<PeriodontalReading>[];
  onReadingsChange?: (readings: PeriodontalReading[]) => void;
  onPresenceChange?: (tooth: string, presence: "missing" | "implant") => void;
}
const empty: readonly Partial<PeriodontalReading>[] = [];
export function PerioChart({
  patientId,
  readOnly,
  active,
  readings = empty,
  onReadingsChange,
  onPresenceChange,
}: Props) {
  const mouth = useMouthState(),
    queryClient = useQueryClient(),
    workflow = useClinicalWorkflowQuery(patientId);
  const [session, setSession] = useState(() =>
    createPerioSession(createPerioExam(mouth, readings), mouth),
  );
  const lastSaved = useRef(session);
  const [dirty, setDirty] = useState(false);
  const current = useRef(session);
  current.current = session;
  const [closed, setClosed] = useState(false);
  const closedRef = useRef(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [ready, setReady] = useState(readOnly),
    [error, setError] = useState(""),
    [status, setStatus] = useState(readOnly ? "Examen histórico" : "Cargando borrador…"),
    [phrase, setPhrase] = useState(""),
    [finishing, setFinishing] = useState(false),
    [listening, setListening] = useState(false),
    [feedback, setFeedback] = useState<string | null>("silent");
  const writer = useRef<DraftWriter<PerioDraftData> | null>(null),
    recognition = useRef<Recognition | null>(null),
    listeningRef = useRef(false),
    finishingRef = useRef(false);
  const latestExam = workflow.data?.periodontalExams[0];
  const previousParsed = perioExamDataSchema.safeParse(latestExam?.metadata?.perioExam);
  const previous =
    !readOnly && previousParsed.success ? previousParsed.data : createPerioExam(mouth, readings);
  useEffect(() => {
    if (readOnly || workflow.isLoading) return;
    let cancelled = false;
    void getBrowserApi()
      .perioDrafts.get(patientId)
      .then((draft) => {
        if (cancelled) return;
        writer.current = new DraftWriter(async (data, version) => {
          const saved = await getBrowserApi().perioDrafts.save(patientId, data, version);
          return saved.version;
        }, draft?.version ?? 0);
        if (draft) {
          const restored = reconcileSessionMouth({ ...draft.data, past: [] }, mouth);
          lastSaved.current = restored;
          setSession(restored);
          setDirty(false);
        } else if (previousParsed.success)
          setSession(createPerioSession(previousParsed.data, mouth));
        setStatus(draft ? "Borrador recuperado" : "Sin cambios");
        setReady(true);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudo cargar el borrador.");
      });
    return () => {
      cancelled = true;
    };
    // A draft is loaded once per patient; mouth updates reconcile independently.
  }, [patientId, readOnly, loadAttempt, workflow.isLoading]);
  useEffect(() => {
    setSession((s) => reconcileSessionMouth(s, mouth));
  }, [mouth]);
  useEffect(() => {
    onReadingsChange?.(examToReadings(session.exam, { requireMargin: true }));
  }, [session.exam, onReadingsChange]);
  const persist = useCallback(async (state: PerioSession) => {
    if (!writer.current) throw new Error("El borrador todavía no está disponible.");
    setStatus("Guardando…");
    await writer.current.write({
      order: state.order,
      exam: state.exam,
      cursor: state.cursor,
      lastTriplet: state.lastTriplet,
    });
    lastSaved.current = state;
    if (current.current === state) setDirty(false);
    setStatus("Borrador guardado");
  }, []);
  useUnsavedChangesGuard({
    dirty: dirty && !readOnly && !closed,
    onSave: async () => {
      await persist(current.current);
      await writer.current!.flush();
    },
    onDiscard: () => {
      current.current = lastSaved.current;
      setSession(lastSaved.current);
      setDirty(false);
    },
  });
  useEffect(() => {
    if (!ready || readOnly || finishingRef.current || closedRef.current) return;
    const timer = setTimeout(() => {
      void persist(session).catch((e) => {
        setError(e.message);
        setStatus("Sin guardar");
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [session, ready, readOnly, persist]);
  useEffect(
    () => () => {
      if (!readOnly && writer.current && !finishingRef.current && !closedRef.current) {
        const state = current.current;
        void writer.current
          .write({
            order: state.order,
            exam: state.exam,
            cursor: state.cursor,
            lastTriplet: state.lastTriplet,
          })
          .catch(() => undefined);
      }
    },
    [patientId, readOnly],
  );
  const dispatch = useCallback(
    (command: PerioCommand) => {
      if (readOnly || !ready || finishingRef.current || closedRef.current)
        throw new Error("El periodontograma no está disponible para editar.");
      if (command.type === "missing" || command.type === "implant") {
        onPresenceChange?.(current.current.cursor.tooth, command.type);
        return;
      }
      const next = applyPerioCommand(current.current, command, mouth);
      current.current = next;
      setSession(next);
      setDirty(true);
      setError("");
      if (feedback === "spoken" && typeof speechSynthesis !== "undefined")
        speechSynthesis.speak(
          new SpeechSynthesisUtterance(
            next.cursor.finished
              ? "Recorrido terminado"
              : `${next.cursor.tooth}, ${next.cursor.face}`,
          ),
        );
      if (feedback === "beep") {
        const Context = window.AudioContext;
        if (Context) {
          const audio = new Context(),
            tone = audio.createOscillator(),
            gain = audio.createGain();
          gain.gain.value = 0.04;
          tone.connect(gain);
          gain.connect(audio.destination);
          tone.start();
          tone.stop(audio.currentTime + 0.08);
          tone.onended = () => {
            void audio.close();
          };
        }
      }
    },
    [readOnly, ready, onPresenceChange, mouth, feedback],
  );
  useEffect(
    () => (active && !readOnly ? registerPerioSession(patientId, dispatch) : undefined),
    [patientId, active, readOnly, dispatch],
  );
  const submitPhrase = useCallback(
    (text: string) => {
      const result = parsePerioDictation(text);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      try {
        dispatch(result.command);
        setPhrase("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Repite.");
      }
    },
    [dispatch],
  );
  const submitRef = useRef(submitPhrase);
  submitRef.current = submitPhrase;
  const toggleMic = useCallback(() => {
    if (listeningRef.current) {
      listeningRef.current = false;
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const scope = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Constructor = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
    if (!Constructor) {
      setError(
        "Este navegador no permite dictado continuo. Puedes introducir los comandos con el teclado.",
      );
      return;
    }
    const rec = new Constructor();
    recognition.current = rec;
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result?.isFinal) submitRef.current(result[0].transcript);
      }
    };
    rec.onerror = (event) => {
      listeningRef.current = false;
      setListening(false);
      setError(`Dictado: ${event.error}.`);
    };
    rec.onend = () => {
      if (listeningRef.current) {
        try {
          rec.start();
        } catch {
          listeningRef.current = false;
          setListening(false);
        }
      }
    };
    try {
      rec.start();
      listeningRef.current = true;
      setListening(true);
    } catch {
      setError("No se pudo activar el micrófono.");
    }
  }, []);
  useEffect(() => {
    if (!active) {
      listeningRef.current = false;
      recognition.current?.stop();
      setListening(false);
    }
    const key = (event: KeyboardEvent) => {
      if (active && event.key === "F8" && !readOnly && ready) {
        event.preventDefault();
        toggleMic();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, readOnly, ready, toggleMic]);
  useEffect(
    () => () => {
      listeningRef.current = false;
      recognition.current?.stop();
    },
    [],
  );
  const finish = async () => {
    if (finishingRef.current || closedRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    recognition.current?.stop();
    listeningRef.current = false;
    setListening(false);
    try {
      await persist(current.current);
      const version = await writer.current!.flush();
      await getBrowserApi().perioDrafts.finish(patientId, version);
      writer.current = new DraftWriter(
        async (data, v) => (await getBrowserApi().perioDrafts.save(patientId, data, v)).version,
        0,
      );
      closedRef.current = true;
      setClosed(true);
      setDirty(false);
      setStatus("Examen guardado");
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["denty", "clinical", patientId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo finalizar; el borrador se conserva.");
    } finally {
      finishingRef.current = false;
      setFinishing(false);
    }
  };
  const run = (command: PerioCommand) => {
    try {
      dispatch(command);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Repite.");
    }
  };
  const disabled = readOnly || !ready || finishing || closed;
  return (
    <section className={styles.chart} aria-label="Periodontograma">
      <Title order={3}>Periodontograma</Title>
      <Text size="sm">
        Mesial → central → distal · Margen negativo = recesión · F8 pausa el dictado
      </Text>
      <Group mt="sm">
        <Text aria-live="polite">
          {session.cursor.finished
            ? "Recorrido terminado"
            : `${session.cursor.tooth} · ${session.cursor.face} · ${session.cursor.field === "pd" ? "sondaje" : "margen"}`}
        </Text>
        <Text size="sm" aria-live="polite">
          {status}
        </Text>
      </Group>
      {error ? (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      ) : null}
      {!readOnly ? (
        <>
          <Group mt="sm">
            <TextInput
              label="Trío o comando"
              placeholder="tres dos tres"
              value={phrase}
              disabled={disabled}
              onChange={(e) => setPhrase(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitPhrase(phrase);
              }}
            />
            <Button disabled={disabled} onClick={() => submitPhrase(phrase)}>
              Introducir
            </Button>
            <Button disabled={disabled} variant="light" onClick={toggleMic}>
              {listening ? "Pausar dictado" : "Dictar"}
            </Button>
            <Select
              label="Confirmación"
              value={feedback}
              onChange={setFeedback}
              data={[
                { value: "silent", label: "Silenciosa" },
                { value: "beep", label: "Pitido" },
                { value: "spoken", label: "Leer diente" },
              ]}
            />
          </Group>
          <Group mt="sm">
            <Button variant="subtle" disabled={disabled} onClick={() => run({ type: "back" })}>
              Atrás
            </Button>
            <Button variant="subtle" disabled={disabled} onClick={() => run({ type: "undo" })}>
              Deshacer
            </Button>
            <Button
              variant="subtle"
              disabled={disabled}
              onClick={() =>
                run({ type: "field", field: session.cursor.field === "pd" ? "gm" : "pd" })
              }
            >
              Cambiar a {session.cursor.field === "pd" ? "margen" : "sondaje"}
            </Button>
            <Button
              variant="subtle"
              disabled={disabled}
              onClick={() =>
                run({
                  type: "face",
                  face: session.cursor.face === "vestibular" ? "palatal" : "vestibular",
                })
              }
            >
              Cambiar cara
            </Button>
            <Button variant="subtle" disabled={disabled} onClick={() => run({ type: "missing" })}>
              Marcar ausente
            </Button>
            <Button variant="subtle" disabled={disabled} onClick={() => run({ type: "implant" })}>
              Marcar implante
            </Button>
          </Group>
        </>
      ) : null}
      <Select
        label="Orden de sondaje"
        value={session.order}
        disabled={disabled}
        data={[
          { value: "clinical", label: "Recorrido clínico" },
          { value: "vestibular_first", label: "Vestibular primero" },
        ]}
        onChange={(order) => {
          if (order === "clinical" || order === "vestibular_first") run({ type: "order", order });
        }}
      />
      <PerioSummaryBar exam={session.exam} />
      <PerioCompare current={session.exam} previous={previous} />
      {["Superior", "Inferior"].map((arch, index) => (
        <div className={styles.scroll} key={arch}>
          <table className={styles.table} aria-label={`Arcada ${arch}`}>
            <thead>
              <tr>
                <th>Diente</th>
                {PERIODONTAL_SITES.map((site) => (
                  <th key={site}>
                    {site}
                    <br />
                    PD / GM
                  </th>
                ))}
                <th>Movilidad</th>
                <th>Furca B / L / M / D</th>
                <th>Gráfico</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(session.exam.teeth)
                .filter(([tooth]) => (index === 0 ? /^[1256]/.test(tooth) : /^[3478]/.test(tooth)))
                .map(([tooth, data]) => (
                  <tr
                    key={tooth}
                    className={
                      data.missing
                        ? styles.absent
                        : session.cursor.tooth === tooth
                          ? styles.active
                          : undefined
                    }
                  >
                    <th>
                      <button
                        disabled={data.missing || disabled}
                        onClick={() => run({ type: "goTo", tooth })}
                      >
                        {tooth}
                      </button>
                      {data.missing ? " Ausente" : data.implant ? " Implante" : ""}
                    </th>
                    {PERIODONTAL_SITES.map((site) => (
                      <td key={site}>
                        {data.missing ? (
                          "—"
                        ) : (
                          <>
                            <Group gap={3} wrap="nowrap">
                              {(["pd", "gm"] as const).map((field) => (
                                <input
                                  className={styles.input}
                                  key={field}
                                  type="number"
                                  min={field === "pd" ? 0 : -15}
                                  max={field === "pd" ? 15 : 5}
                                  aria-label={`${tooth} ${site} ${field === "pd" ? "sondaje" : "margen"}`}
                                  value={data.sites[site][field] ?? ""}
                                  disabled={disabled}
                                  onChange={(e) => {
                                    const value = e.currentTarget.value;
                                    run({
                                      type: "site",
                                      tooth,
                                      site,
                                      patch: { [field]: value === "" ? null : Number(value) },
                                    });
                                  }}
                                  onKeyDown={(e) => {
                                    if (
                                      ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(
                                        e.key,
                                      )
                                    ) {
                                      const inputs = Array.from(
                                        e.currentTarget
                                          .closest("table")!
                                          .querySelectorAll<HTMLInputElement>(
                                            "input[type=number]:not(:disabled)",
                                          ),
                                      );
                                      const offset =
                                        e.key === "ArrowRight"
                                          ? 1
                                          : e.key === "ArrowLeft"
                                            ? -1
                                            : e.key === "ArrowDown"
                                              ? 12
                                              : -12;
                                      inputs[inputs.indexOf(e.currentTarget) + offset]?.focus();
                                      e.preventDefault();
                                    }
                                  }}
                                />
                              ))}
                            </Group>
                            {(["bop", "plaque", "suppuration"] as const).map((flag) => (
                              <label key={flag} className={styles.flag}>
                                <input
                                  type="checkbox"
                                  aria-label={`${tooth} ${site} ${flag}`}
                                  checked={data.sites[site][flag]}
                                  disabled={disabled}
                                  onChange={(e) =>
                                    run({
                                      type: "site",
                                      tooth,
                                      site,
                                      patch: { [flag]: e.currentTarget.checked },
                                    })
                                  }
                                />
                                {flag === "bop"
                                  ? "Sangrado"
                                  : flag === "plaque"
                                    ? "Placa"
                                    : "Supura"}
                              </label>
                            ))}
                          </>
                        )}
                      </td>
                    ))}
                    <td>
                      {!data.missing ? (
                        <input
                          className={styles.input}
                          aria-label={`Movilidad ${tooth}`}
                          type="number"
                          min={0}
                          max={3}
                          value={data.mobility ?? ""}
                          disabled={disabled}
                          onChange={(e) => {
                            const value = e.currentTarget.value;
                            if (value === "") return;
                            run({ type: "goTo", tooth });
                            run({ type: "mobility", value: Number(value) });
                          }}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {!data.missing
                        ? (["b", "l", "m", "d"] as const).map((entry) => (
                            <input
                              key={entry}
                              className={styles.input}
                              aria-label={`Furca ${tooth} ${entry}`}
                              type="number"
                              min={0}
                              max={3}
                              value={data.furcation[entry] ?? ""}
                              disabled={disabled}
                              onChange={(e) => {
                                const value = Number(e.currentTarget.value);
                                run({ type: "goTo", tooth });
                                run({ type: "furcation", value, entry });
                              }}
                            />
                          ))
                        : "—"}
                    </td>
                    <td className={styles.graph}>
                      {!data.missing ? <PerioToothGraph tooth={tooth} data={data} /> : null}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
      <Group mt="md">
        <PerioPrint />
        {closed ? (
          <Button
            variant="light"
            onClick={() => {
              const next = createPerioSession(createPerioExam(mouth), mouth, session.order);
              current.current = next;
              setSession(next);
              closedRef.current = false;
              setClosed(false);
              setStatus("Nuevo examen");
            }}
          >
            Nuevo examen
          </Button>
        ) : null}
        {!readOnly ? (
          <Button
            disabled={disabled || perioSummary(session.exam).siteCount === 0}
            loading={finishing}
            onClick={() => void finish()}
          >
            {perioSummary(session.exam).remainingSites
              ? "Guardar examen parcial"
              : "Finalizar examen"}
          </Button>
        ) : null}
      </Group>
    </section>
  );
}
