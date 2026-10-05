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
}

export function PatientClinicalSummary({ patientId }: PatientClinicalSummaryProps) {
  const [problemTooth, setProblemTooth] = useState("");
  const [problemTitle, setProblemTitle] = useState("");
  const [note, setNote] = useState("");
  const workflowQuery = useClinicalWorkflowQuery(patientId);
  const problemMutation = useCreateClinicalProblemMutation(patientId);
  const encounterMutation = useCreateClinicalEncounterMutation(patientId);

  const createProblem = async () => {
    if (!problemTitle.trim()) return;
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
    if (!note.trim()) return;
    await encounterMutation.mutateAsync({
      narrativeNote: note.trim(),
      sign: true,
    });
    setNote("");
  };

  const problems = workflowQuery.data?.problems ?? [];
  const encounters = workflowQuery.data?.encounters ?? [];
  const encounterTimeline = encounters
    .slice(0, 5)
    .reduce<Array<{ date: string; encounters: typeof encounters }>>((groups, encounter) => {
      const date = encounter.createdAt ? dateDMY(encounter.createdAt) : "Fecha no disponible";
      const current = groups.find((group) => group.date === date);
      if (current) current.encounters.push(encounter);
      else groups.push({ date, encounters: [encounter] });
      return groups;
    }, []);

  return (
    <>
      {workflowQuery.isError ? (
        <Alert mb="md" color="red" title="Error al cargar historia">
          Revisa la conexión e inténtalo de nuevo.
        </Alert>
      ) : null}
      <div className={styles.gridTwo}>
        <section className={styles.section}>
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={3}>Problemas</Title>
              <Text c="dimmed" size="sm" mt="xs">
                Hallazgos y diagnósticos separados de los tratamientos del plan.
              </Text>
            </div>
            <Badge variant="light">
              {workflowQuery.isError
                ? "No disponible"
                : workflowQuery.isPending
                  ? "Cargando…"
                  : problems.length}
            </Badge>
          </Group>
          <>
            <SimpleGrid cols={{ base: 1, sm: 2 }} mt="lg">
              <TextInput
                label="Diente / zona"
                placeholder="Ej. 46"
                value={problemTooth}
                onChange={(event) => setProblemTooth(event.currentTarget.value)}
              />
              <TextInput
                label="Problema"
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

          {problemMutation.isError ? (
            <Alert mt="lg" color="red" title="No se guardó el problema">
              La operación fue rechazada por el servidor.
            </Alert>
          ) : null}

          <div className={styles.rowList}>
            {workflowQuery.isError ? (
              <Text c="dimmed">Problemas no disponibles.</Text>
            ) : workflowQuery.isPending ? (
              <Text c="dimmed" role="status">
                Cargando problemas…
              </Text>
            ) : problems.length === 0 ? (
              <Text c="dimmed">Sin problemas registrados.</Text>
            ) : (
              problems.slice(0, 6).map((problem) => (
                <div className={styles.row} key={problem.id}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>{problem.title}</span>
                    <span className={styles.rowMeta}>
                      {problem.tooth ? `Diente ${problem.tooth}` : "Zona general"}
                    </span>
                  </div>
                  <Badge variant="light">{problem.status}</Badge>
                </div>
              ))
            )}
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
            <Badge variant="light">
              {workflowQuery.isError
                ? "No disponible"
                : workflowQuery.isPending
                  ? "Cargando…"
                  : encounters.length}
            </Badge>
          </Group>

          <>
            <Textarea
              mt="lg"
              minRows={3}
              label="Evolución"
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

          {encounterMutation.isError ? (
            <Alert mt="lg" color="red" title="No se guardó la evolución">
              La nota no se ha conservado únicamente en el navegador.
            </Alert>
          ) : null}

          <div className={styles.rowList}>
            {workflowQuery.isError ? (
              <Text c="dimmed">Evoluciones no disponibles.</Text>
            ) : workflowQuery.isPending ? (
              <Text c="dimmed" role="status">
                Cargando evoluciones…
              </Text>
            ) : encounters.length === 0 ? (
              <Text c="dimmed">Sin evoluciones registradas.</Text>
            ) : (
              encounterTimeline.map((group) => (
                <div className={styles.rowMain} key={group.date}>
                  <span className={styles.rowMeta}>{group.date}</span>
                  {group.encounters.map((encounter) => (
                    <div className={styles.row} key={encounter.id}>
                      <div className={styles.rowMain}>
                        <span className={styles.rowTitle}>{encounter.narrativeNote}</span>
                        {encounter.nextVisit ? (
                          <span className={styles.rowMeta}>Próxima: {encounter.nextVisit}</span>
                        ) : null}
                        <span className={styles.rowMeta}>
                          {encounter.createdAt ? hhmm(encounter.createdAt) : "Hora no disponible"}
                        </span>
                      </div>
                      <Badge color={encounter.signedAt ? "green" : "yellow"}>
                        {encounter.signedAt ? "Firmada" : "Borrador"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
