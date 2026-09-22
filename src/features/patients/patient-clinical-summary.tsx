"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  SimpleGrid,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useState } from "react";

import { dateDMY, hhmm } from "@/domain/dates";
import {
  useClinicalWorkflowQuery,
  useCreateClinicalEncounterMutation,
  useCreateClinicalProblemMutation,
} from "@/shared/clinical/clinical-data";
import styles from "@/shared/ui/parity.module.css";

interface PatientClinicalSummaryProps {
  patientId: string;
  demoMode: boolean;
}

export function PatientClinicalSummary({
  patientId,
  demoMode,
}: PatientClinicalSummaryProps) {
  const [problemTooth, setProblemTooth] = useState("");
  const [problemTitle, setProblemTitle] = useState("");
  const [note, setNote] = useState("");
  const workflowQuery = useClinicalWorkflowQuery(patientId, !demoMode);
  const problemMutation = useCreateClinicalProblemMutation(patientId);
  const encounterMutation = useCreateClinicalEncounterMutation(patientId);

  const createProblem = async () => {
    if (demoMode || !problemTitle.trim()) return;
    await problemMutation.mutateAsync({
      ...(problemTooth.trim() ? { tooth: problemTooth.trim() } : {}),
      title: problemTitle.trim(),
      status: "ACTIVE",
      confirm: true,
    });
    setProblemTooth("");
    setProblemTitle("");
  };

  const createEncounter = async () => {
    if (demoMode || !note.trim()) return;
    await encounterMutation.mutateAsync({
      narrativeNote: note.trim(),
      sign: true,
    });
    setNote("");
  };

  if (!demoMode && workflowQuery.isError) {
    return (
      <Alert color="red" title="No se pudo cargar la historia clínica">
        Denty no ha sustituido la historia remota por datos demo.
      </Alert>
    );
  }

  const problems = workflowQuery.data?.problems ?? [];
  const encounters = workflowQuery.data?.encounters ?? [];

  return (
    <div className={styles.gridTwo}>
      <section className={styles.section}>
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={3}>Problemas activos</Title>
            <Text c="dimmed" size="sm" mt="xs">
              Hallazgos y diagnósticos separados de los tratamientos del plan.
            </Text>
          </div>
          <Badge variant="light">{demoMode ? "Demo" : problems.length}</Badge>
        </Group>

        {demoMode ? (
          <Alert mt="lg" color="blue" title="Historia clínica demo">
            La creación de problemas clínicos solo se persiste con backend configurado.
          </Alert>
        ) : (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2 }} mt="lg">
              <TextInput
                label="Diente / zona"
                placeholder="Ej. 46"
                value={problemTooth}
                onChange={(event) => setProblemTooth(event.currentTarget.value)}
              />
              <TextInput
                label="Problema clínico"
                placeholder="Ej. dolor a la masticación"
                value={problemTitle}
                onChange={(event) => setProblemTitle(event.currentTarget.value)}
              />
            </SimpleGrid>
            <Button
              mt="md"
              size="xs"
              loading={problemMutation.isPending}
              disabled={!problemTitle.trim()}
              onClick={() => void createProblem()}
            >
              Registrar problema
            </Button>
          </>
        )}

        {problemMutation.isError ? (
          <Alert mt="lg" color="red" title="No se pudo registrar el problema">
            La operación fue rechazada por el servidor.
          </Alert>
        ) : null}

        <div className={styles.rowList}>
          {problems.slice(0, 6).map((problem) => (
            <div className={styles.row} key={problem.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{problem.title}</span>
                <span className={styles.rowMeta}>
                  {problem.tooth ? `Diente ${problem.tooth}` : "Zona general"}
                </span>
              </div>
              <Badge variant="light">{problem.status}</Badge>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={3}>Evolución clínica</Title>
            <Text c="dimmed" size="sm" mt="xs">
              Notas clínicas firmadas y separadas de la agenda.
            </Text>
          </div>
          <Badge variant="light">{demoMode ? "Demo" : encounters.length}</Badge>
        </Group>

        {!demoMode ? (
          <>
            <Textarea
              mt="lg"
              minRows={3}
              label="Nota de evolución"
              placeholder="Motivo, hallazgos, procedimiento e indicaciones"
              value={note}
              onChange={(event) => setNote(event.currentTarget.value)}
            />
            <Button
              mt="md"
              size="xs"
              loading={encounterMutation.isPending}
              disabled={!note.trim()}
              onClick={() => void createEncounter()}
            >
              Firmar nota clínica
            </Button>
          </>
        ) : null}

        {encounterMutation.isError ? (
          <Alert mt="lg" color="red" title="No se pudo registrar la evolución">
            La nota no se ha conservado únicamente en el navegador.
          </Alert>
        ) : null}

        <div className={styles.rowList}>
          {encounters.slice(0, 5).map((encounter) => (
            <div className={styles.row} key={encounter.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{encounter.narrativeNote}</span>
                <span className={styles.rowMeta}>
                  {encounter.createdAt
                    ? `${dateDMY(encounter.createdAt)} · ${hhmm(encounter.createdAt)}`
                    : "Fecha no disponible"}
                </span>
              </div>
              <Badge color={encounter.signedAt ? "green" : "yellow"}>
                {encounter.signedAt ? "Firmada" : "Borrador"}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
