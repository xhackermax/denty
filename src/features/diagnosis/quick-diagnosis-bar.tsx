"use client";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
} from "@mantine/core";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bruxismSigns,
  diagnosisInputSchema,
  suggestPeriodontalDiagnosis,
  type DiagnosisInput,
} from "@/domain/diagnosis";
import { getBrowserApi } from "@/shared/api/browser";
import type { PeriodontalReading } from "@/domain/periodontal";
import { TreatmentSuggestionPanel } from "./treatment-suggestion-panel";
const periodontalLabels = {
  healthy: "Encía sana",
  gingivitis: "Gingivitis",
  periodontitis: "Periodontitis",
};
const signs = {
  wear: "Desgaste",
  masseter_hypertrophy: "Hipertrofia maseterina",
  tmj_pain: "Dolor articular",
  fractures: "Fracturas",
  linea_alba: "Línea alba",
  tongue_scalloping: "Lengua festoneada",
};
export function QuickDiagnosisBar({
  patientId,
  readings = [],
  readOnly = false,
}: {
  patientId: string;
  readings?: readonly PeriodontalReading[];
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const queryKey = ["diagnoses", patientId];
  const query = useQuery({ queryKey, queryFn: () => getBrowserApi().diagnoses.list(patientId) });
  const [category, setCategory] = useState<"periodontal" | "bruxism">("periodontal");
  const [value, setValue] = useState<"healthy" | "gingivitis" | "periodontitis">("healthy");
  const [stage, setStage] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [extent, setExtent] = useState<string | null>(null);
  const [justification, setJustification] = useState("");
  const [bruxism, setBruxism] = useState(false);
  const [type, setType] = useState("sleep");
  const [certainty, setCertainty] = useState("probable");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedSigns, setSelectedSigns] = useState<string[]>([]);
  const draft =
    category === "periodontal"
      ? {
          category,
          value,
          justification,
          detail:
            value === "periodontitis"
              ? {
                  ...(stage ? { stage } : {}),
                  ...(grade ? { grade } : {}),
                  ...(extent ? { extent } : {}),
                }
              : {},
        }
      : {
          category,
          value: bruxism ? "bruxism" : "no_bruxism",
          justification,
          detail: bruxism ? { type, certainty, signs: selectedSigns } : { signs: [] },
        };
  const validation = diagnosisInputSchema.safeParse(draft);
  const mutation = useMutation({
    mutationFn: (input: DiagnosisInput) => getBrowserApi().diagnoses.create(patientId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const resolve = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      getBrowserApi().diagnoses.resolve(patientId, id, version),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const suggestion = suggestPeriodontalDiagnosis(readings);
  return (
    <section aria-label="Diagnóstico periodontal rápido">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={700}>Diagnóstico periodontal rápido</Text>
          <Group gap="xs">
            {query.data?.current.map((d) => (
              <Badge key={d.id} variant="light">
                {d.category === "periodontal"
                  ? periodontalLabels[d.value as keyof typeof periodontalLabels]
                  : d.value === "bruxism"
                    ? "Bruxismo"
                    : "Sin bruxismo"}{" "}
                · {new Date(d.createdAt).toLocaleDateString("es-ES")}
              </Badge>
            ))}
          </Group>
        </Group>
        <Group>
          <Button
            size="xs"
            variant={category === "periodontal" ? "filled" : "light"}
            aria-pressed={category === "periodontal"}
            onClick={() => setCategory("periodontal")}
          >
            Periodontal
          </Button>
          <Button
            size="xs"
            variant={category === "bruxism" ? "filled" : "light"}
            aria-pressed={category === "bruxism"}
            onClick={() => setCategory("bruxism")}
          >
            Bruxismo
          </Button>
        </Group>
        {category === "periodontal" ? (
          <>
            <Group>
              {(["healthy", "gingivitis", "periodontitis"] as const).map((v) => (
                <Button
                  key={v}
                  size="xs"
                  variant={value === v ? "filled" : "light"}
                  aria-pressed={value === v}
                  disabled={readOnly}
                  onClick={() => {
                    setValue(v);
                    if (v === "periodontitis" && suggestion?.value === "periodontitis") {
                      setStage(suggestion.detail.stage ?? null);
                      setGrade(suggestion.detail.grade ?? null);
                      setExtent(suggestion.detail.extent ?? null);
                    }
                  }}
                >
                  {periodontalLabels[v]}
                </Button>
              ))}
            </Group>
            {value === "periodontitis" ? (
              <Group>
                <Select
                  label="Estadio"
                  data={["I", "II", "III", "IV"]}
                  value={stage}
                  onChange={setStage}
                  clearable
                  disabled={readOnly}
                />
                <Select
                  label="Grado"
                  data={["A", "B", "C"]}
                  value={grade}
                  onChange={setGrade}
                  clearable
                  disabled={readOnly}
                />
                <Select
                  label="Extensión"
                  data={[
                    { value: "localized", label: "Localizada" },
                    { value: "generalized", label: "Generalizada" },
                    { value: "molar_incisor", label: "Molar-incisivo" },
                  ]}
                  value={extent}
                  onChange={setExtent}
                  clearable
                  disabled={readOnly}
                />
              </Group>
            ) : null}
            {suggestion ? (
              <Text size="xs" c="dimmed">
                Sugerencia según mediciones: {periodontalLabels[suggestion.value]}. Confirma la
                causa periodontal y el diagnóstico clínico.
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Switch
              label="Bruxismo presente"
              checked={bruxism}
              disabled={readOnly}
              onChange={(event) => setBruxism(event.currentTarget.checked)}
            />
            {bruxism ? (
              <>
                <Group>
                  <Select
                    label="Tipo de bruxismo"
                    value={type}
                    onChange={(v) => setType(v ?? "sleep")}
                    data={[
                      { value: "awake", label: "Vigilia" },
                      { value: "sleep", label: "Sueño" },
                      { value: "both", label: "Ambos" },
                    ]}
                    disabled={readOnly}
                  />
                  <Select
                    label="Certeza"
                    value={certainty}
                    onChange={(v) => setCertainty(v ?? "probable")}
                    data={[
                      { value: "possible", label: "Posible" },
                      { value: "probable", label: "Probable" },
                      { value: "definite", label: "Definitivo" },
                    ]}
                    disabled={readOnly}
                  />
                </Group>
                <Group>
                  {bruxismSigns.map((sign) => (
                    <Checkbox
                      key={sign}
                      label={signs[sign]}
                      checked={selectedSigns.includes(sign)}
                      disabled={readOnly}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setSelectedSigns((current) =>
                          checked ? [...current, sign] : current.filter((s) => s !== sign),
                        );
                      }}
                    />
                  ))}
                </Group>
              </>
            ) : null}
          </>
        )}
        <Textarea
          label="Justificación"
          value={justification}
          onChange={(event) => setJustification(event.currentTarget.value)}
          disabled={readOnly}
          placeholder="Hallazgos y motivo del diagnóstico"
          rows={2}
        />
        {!validation.success ? (
          <Text size="xs" c="orange">
            {validation.error.issues[0]?.message}
          </Text>
        ) : null}
        <Group>
          <Button
            size="xs"
            loading={mutation.isPending}
            disabled={readOnly || !validation.success}
            onClick={() => {
              if (validation.success) mutation.mutate(validation.data);
            }}
          >
            Guardar diagnóstico
          </Button>
          {mutation.isSuccess ? (
            <Text size="sm" c="teal">
              Diagnóstico guardado
            </Text>
          ) : null}
        </Group>
        {query.isError || mutation.isError || resolve.isError ? (
          <Alert color="red">
            {mutation.error?.message ??
              resolve.error?.message ??
              "No se pudieron cargar los diagnósticos."}
          </Alert>
        ) : null}
        {query.data?.current.map((d) => (
          <TreatmentSuggestionPanel
            key={d.id}
            diagnosis={d}
            readings={readings}
            readOnly={readOnly}
          />
        ))}
        <details open={historyOpen}>
          <summary
            onClick={(event) => {
              event.preventDefault();
              setHistoryOpen((open) => !open);
            }}
          >
            Historial de diagnósticos ({query.data?.history.length ?? 0})
          </summary>
          <Stack gap="xs">
            {query.data?.history.map((d) => (
              <Group key={d.id} justify="space-between">
                <div>
                  <Text size="sm">
                    {d.value} · {new Date(d.createdAt).toLocaleString("es-ES")} ·{" "}
                    {d.status === "active" ? "Activo" : "Resuelto"}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {d.justification}
                  </Text>
                </div>
                {d.status === "active" ? (
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    disabled={readOnly}
                    loading={resolve.isPending}
                    onClick={() => resolve.mutate({ id: d.id, version: d.version })}
                  >
                    Marcar resuelto
                  </Button>
                ) : null}
              </Group>
            ))}
          </Stack>
        </details>
      </Stack>
    </section>
  );
}
