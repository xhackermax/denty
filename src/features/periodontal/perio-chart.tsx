"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Group, Select, Text, TextInput, Title } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { useMouthState } from "@/features/odontogram/mouth-state-context";
import {
  PERIODONTAL_SITES,
  normalizePeriodontalSite,
  type PeriodontalReading,
} from "@/domain/periodontal";
import { createPerioExam, examToReadings, examToVisualReadings, perioSummary } from "@/domain/periodontal/exam";
import {
  applyPerioCommand,
  createPerioSession,
  reconcileSessionMouth,
  type PerioCommand,
  type PerioSession,
  type PerioPresenceChange,
} from "@/domain/periodontal/entry-cursor";
import { parsePerioDictation } from "@/features/voice/perio-dictation";
import { useUnsavedChangesGuard } from "@/shared/navigation/use-unsaved-changes-guard";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import { perioExamDataSchema } from "@/shared/api/schemas/perio-drafts";
import { useClinicalWorkflowQuery } from "@/shared/clinical/clinical-data";
import { createPerioDraftOwner, type PerioDraftOwner } from "./draft-owner";
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
  visibleIndicators?: readonly string[];
  onReadingsChange?: (readings: PeriodontalReading[]) => void;
  /** The chart overlay needs PD even when gingival margin (GM) is still unmeasured. */
  onSiteReadingsChange?: (readings: readonly Partial<PeriodontalReading>[]) => void;
  selectedTooth?: string;
  onSelectTooth?: (tooth: string) => void;
  owner?: PerioDraftOwner;
  onPresenceChange?: (tooth: string, presence: "missing" | "implant") => PerioPresenceChange;
  onPresenceRestore?: (change: PerioPresenceChange) => ReturnType<typeof useMouthState>;
  onBeforeFinalize?: () => Promise<void>;
}
const empty: readonly Partial<PeriodontalReading>[] = [];
export function PerioChart({
  patientId,
  readOnly,
  active,
  readings = empty,
  visibleIndicators = [
    "sondaje",
    "recesion",
    "sangrado",
    "supuracion",
    "placa",
    "movilidad",
    "furcas",
  ],
  onReadingsChange,
  onSiteReadingsChange,
  selectedTooth,
  onSelectTooth,
  onPresenceChange,
  onPresenceRestore,
  onBeforeFinalize,
  owner: providedOwner,
}: Props) {
  const mouth = useMouthState(),
    queryClient = useQueryClient(),
    workflow = useClinicalWorkflowQuery(patientId);
  const [localOwner] = useState(createPerioDraftOwner);
  const owner = readOnly ? localOwner : (providedOwner ?? localOwner);
  const chartRef = useRef<HTMLElement>(null);
  const [session, setSession] = useState(
    () => owner.session ?? createPerioSession(createPerioExam(mouth, readings), mouth),
  );
  const current = useRef(session);
  current.current = owner.session ?? session;
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [manualSelection, setManualSelection] = useState<string | null>(null);
  useEffect(() => setManualSelection(null), [selectedTooth]);
  const [ready, setReady] = useState(readOnly || owner.initialized),
    [dirty, setDirty] = useState(owner.dirty),
    [closed, setClosed] = useState(owner.closed),
    [error, setError] = useState(owner.error),
    [status, setStatus] = useState(readOnly ? "Examen histórico" : owner.status),
    [phrase, setPhrase] = useState(""),
    [finishing, setFinishing] = useState(owner.busy),
    [listening, setListening] = useState(false),
    [feedback, setFeedback] = useState<string | null>("silent");
  const recognition = useRef<Recognition | null>(null),
    listeningRef = useRef(false);
  const hasIndicator = (indicator: string) => visibleIndicators.includes(indicator);
  const showSondaje = hasIndicator("sondaje");
  const showRecession = hasIndicator("recesion");
  const showMobility = hasIndicator("movilidad");
  const showFurcation = hasIndicator("furcas");
  const showGraph = showSondaje || showRecession;
  const latestExam = workflow.data?.periodontalExams[0];
  const previousParsed = perioExamDataSchema.safeParse(latestExam?.metadata?.perioExam);
  const previous =
    !readOnly && previousParsed.success
      ? previousParsed.data
      : createPerioExam(
          mouth,
          latestExam
            ? latestExam.sites.map((reading) => ({
                tooth: reading.tooth,
                site: normalizePeriodontalSite(reading.site),
                ...(reading.probingDepth === undefined
                  ? {}
                  : { probingDepth: reading.probingDepth }),
                ...(reading.recession === undefined ? {} : { recession: reading.recession }),
                ...(reading.bleeding === undefined ? {} : { bleeding: reading.bleeding }),
                ...(reading.plaque === undefined ? {} : { plaque: reading.plaque }),
                ...(reading.suppuration === undefined ? {} : { suppuration: reading.suppuration }),
                ...(reading.mobility === undefined ? {} : { mobility: reading.mobility }),
                ...(reading.furcation === undefined ? {} : { furcation: reading.furcation }),
              }))
            : readings,
        );
  useEffect(
    () =>
      owner.subscribe(() => {
        if (owner.session) {
          current.current = owner.session;
          setSession(owner.session);
        }
        setReady(readOnly || owner.initialized);
        setDirty(owner.dirty);
        setClosed(owner.closed);
        setFinishing(owner.busy);
        setStatus(owner.status);
        setError(owner.error);
      }),
    [owner, readOnly],
  );
  useEffect(() => {
    if (readOnly || workflow.isLoading) return;
    const prior = perioSummary(previous).siteCount > 0 ? previous : null;
    void owner
      .initialize(getBrowserApi().perioDrafts, patientId, mouth, prior)
      .catch(() => undefined);
    // The owner loads once, even when saving the odontogram remounts its editor.
  }, [owner, patientId, readOnly, loadAttempt, workflow.isLoading]);
  useEffect(() => {
    if (readOnly) setSession((s) => reconcileSessionMouth(s, mouth));
    else owner.reconcile(mouth);
  }, [mouth, owner, readOnly]);
  useEffect(() => {
    if (!ready) return;
    onReadingsChange?.(examToReadings(session.exam, { requireMargin: true }));
    onSiteReadingsChange?.(examToVisualReadings(session.exam));
  }, [session.exam, ready, onReadingsChange, onSiteReadingsChange]);
  useUnsavedChangesGuard({
    dirty: dirty && !readOnly && !closed,
    onSave: async () => {
      if (owner.busy) throw new Error("Espera a que termine la finalización del examen.");
      if (owner.checkpoint) await owner.finish();
      else await owner.persist(owner.session!);
    },
    onDiscard: () => owner.discard(),
  });
  useEffect(() => {
    if (!ready || readOnly || !dirty || owner.busy || owner.closed || owner.checkpoint) return;
    const timer = setTimeout(() => {
      void owner.persist(owner.session!).catch(() => undefined);
    }, 600);
    return () => clearTimeout(timer);
  }, [session, ready, readOnly, dirty, owner, finishing]);
  useEffect(
    () => () => {
      if (
        !readOnly &&
        owner.initialized &&
        owner.dirty &&
        !owner.busy &&
        !owner.closed &&
        !owner.checkpoint
      )
        void owner.persist(owner.session!).catch(() => undefined);
    },
    [owner, readOnly],
  );
  const dispatch = useCallback(
    (command: PerioCommand) => {
      if (readOnly || !ready || owner.busy || owner.closed || owner.checkpoint)
        throw new Error("El periodontograma no está disponible para editar.");
      let next: PerioSession;
      if (command.type === "missing" || command.type === "implant") {
        if (!onPresenceChange) throw new Error("La presencia debe modificarse en el odontograma.");
        next = applyPerioCommand(current.current, command, mouth);
        const change = onPresenceChange(current.current.cursor.tooth, command.type);
        next.past[next.past.length - 1]!.presenceChange = change;
      } else if (command.type === "undo" && current.current.past.at(-1)?.presenceChange) {
        if (!onPresenceRestore)
          throw new Error("No se puede restaurar la presencia desde esta vista.");
        const restoredMouth = onPresenceRestore(current.current.past.at(-1)!.presenceChange!);
        next = reconcileSessionMouth(
          applyPerioCommand(current.current, command, restoredMouth),
          restoredMouth,
        );
      } else next = applyPerioCommand(current.current, command, mouth);
      current.current = next;
      owner.update(next);
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
    [readOnly, ready, onPresenceChange, onPresenceRestore, owner, mouth, feedback],
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
    recognition.current?.stop();
    listeningRef.current = false;
    setListening(false);
    try {
      await owner.finish(onBeforeFinalize);
      await queryClient.invalidateQueries({ queryKey: dentyQueryKeys.clinical.patient(patientId) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo finalizar; el borrador se conserva.");
    }
  };
  const run = (command: PerioCommand) => {
    try {
      dispatch(command);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Repite.");
    }
  };
  const disabled = readOnly || !ready || finishing || closed || owner.checkpoint !== null;
  const requestedManualTooth = manualSelection ?? selectedTooth;
  const manualTooth = requestedManualTooth && session.exam.teeth[requestedManualTooth]
    ? requestedManualTooth : session.cursor.tooth;
  const manualData = session.exam.teeth[manualTooth];
  const applyManual = (tooth: string, site: (typeof PERIODONTAL_SITES)[number],
    field: "pd" | "gm", raw: string) => {
    if (raw !== "" && !/^-?[0-9]{1,2}$/.test(raw)) return;
    if (raw === "-" && field === "gm") return;
    run({
      type: "site",
      tooth,
      site,
      patch: { [field]: raw === "" ? null : Number(raw) },
    });
  };
  return (
    <section ref={chartRef} className={styles.chart} aria-label="Periodontograma">
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
      {error && !readOnly && !owner.checkpoint ? (
        <Button
          variant="subtle"
          onClick={() => {
            if (ready) owner.reload();
            setLoadAttempt((n) => n + 1);
          }}
        >
          {ready ? "Descartar cambios y recargar borrador" : "Reintentar carga"}
        </Button>
      ) : null}
      {!readOnly ? (
        <>
          <Group mt="sm" data-print-hide>
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
          <Group mt="sm" data-print-hide>
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
            <Button
              variant="subtle"
              disabled={disabled || !onPresenceChange}
              onClick={() => run({ type: "missing" })}
            >
              Marcar ausente
            </Button>
            <Button
              variant="subtle"
              disabled={disabled || !onPresenceChange}
              onClick={() => run({ type: "implant" })}
            >
              Marcar implante
            </Button>
          </Group>
        </>
      ) : null}
      {!readOnly ? (
        <section className={styles.manualEntry} aria-label={`Entrada manual periodontal pieza ${manualTooth}`}>
          <Group justify="space-between" gap="xs">
            <Text fw={750} size="sm">Sondaje manual · diente {manualTooth}</Text>
            <Text size="xs" c="dimmed">6 sitios · milímetros · cambios visibles en el odontograma</Text>
          </Group>
          <Select
            label="Pieza para entrada manual"
            searchable
            data={Object.keys(session.exam.teeth).filter((tooth) => !session.exam.teeth[tooth]?.missing)}
            value={manualTooth}
            onChange={(value) => {
              if (!value) return;
              setManualSelection(value);
              onSelectTooth?.(value);
            }}
          />
          {manualData?.missing ? (
            <Text size="xs">Pieza ausente: no se puede sondar.</Text>
          ) : manualData ? (
            <div className={styles.manualGrid}>
              {PERIODONTAL_SITES.map((site) => (
                <div key={site} className={styles.manualSite}>
                  <Text size="xs" fw={700}>{site}</Text>
                  {(["pd", "gm"] as const).map((field) => (
                    <label key={field} className={styles.manualField}>
                      <span>{field === "pd" ? "PD" : "GM"}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        step={1}
                        min={field === "pd" ? 0 : -15}
                        max={field === "pd" ? 15 : 5}
                        aria-label={`Entrada manual ${manualTooth} ${site} ${field === "pd" ? "sondaje" : "margen"}`}
                        value={manualData.sites[site][field] ?? ""}
                        disabled={disabled}
                        onChange={(event) => applyManual(manualTooth, site, field, event.currentTarget.value)}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <Text size="xs">Selecciona un diente presente en el odontograma.</Text>
          )}
          <Text size="xs" c="dimmed">
            PD = profundidad de sondaje. GM = margen gingival, opcional. Los valores sin medir
            quedan en blanco, nunca se suponen como cero.
          </Text>
        </section>
      ) : null}
      <Select
        data-print-hide
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
                    {[showSondaje ? "PD" : null, showRecession ? "GM" : null]
                      .filter(Boolean)
                      .join(" / ") || "—"}
                  </th>
                ))}
                {showMobility ? <th>Movilidad</th> : null}
                {showFurcation ? <th>Furca B / L / M / D</th> : null}
                {showGraph ? <th>Gráfico</th> : null}
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
                            {(showSondaje || showRecession) && (
                              <Group gap={3} wrap="nowrap">
                                {(["pd", "gm"] as const)
                                  .filter((field) => (field === "pd" ? showSondaje : showRecession))
                                  .map((field) => (
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
                                          [
                                            "ArrowRight",
                                            "ArrowLeft",
                                            "ArrowUp",
                                            "ArrowDown",
                                          ].includes(e.key)
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
                            )}
                            {(
                              [
                                ["bop", "sangrado"],
                                ["plaque", "placa"],
                                ["suppuration", "supuracion"],
                              ] as const
                            )
                              .filter(([, indicator]) => hasIndicator(indicator))
                              .map(([flag]) => (
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
                    {showMobility ? (
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
                    ) : null}
                    {showFurcation ? (
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
                    ) : null}
                    {showGraph ? (
                      <td className={styles.graph}>
                        {!data.missing ? (
                          <PerioToothGraph
                            tooth={tooth}
                            data={data}
                            visibleIndicators={visibleIndicators}
                          />
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
      <Group mt="md" data-print-hide>
        <PerioPrint target={chartRef} />
        {closed && !readOnly ? (
          <Button variant="light" onClick={() => owner.startNew(mouth, session.order)}>
            Nuevo examen
          </Button>
        ) : null}
        {!readOnly ? (
          <Button
            disabled={
              readOnly ||
              !ready ||
              finishing ||
              closed ||
              perioSummary(session.exam).siteCount === 0
            }
            loading={finishing}
            onClick={() => void finish()}
          >
            {owner.checkpoint
              ? "Reintentar finalización"
              : perioSummary(session.exam).remainingSites
                ? "Guardar examen parcial"
                : "Finalizar examen"}
          </Button>
        ) : null}
      </Group>
    </section>
  );
}
