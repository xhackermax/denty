"use client";

import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";

import { useOdontogramQuery, useRecordPeriodontalMeasurementMutation } from "./odontogram-data";
import styles from "@/shared/ui/parity.module.css";

const SITES = ["MV", "V", "DV", "MP", "P/L", "DP"] as const;

interface PeriodontalQuickEntryProps {
  patientId: string;
  demoMode: boolean;
}

function numberValue(value: string | number): number {
  return typeof value === "number" ? value : Number(value) || 0;
}

export function PeriodontalQuickEntry({ patientId, demoMode }: PeriodontalQuickEntryProps) {
  const [tooth, setTooth] = useState("16");
  const [site, setSite] = useState<(typeof SITES)[number]>("MV");
  const [probingDepth, setProbingDepth] = useState(3);
  const [recession, setRecession] = useState(0);
  const [bleeding, setBleeding] = useState(false);
  const [plaque, setPlaque] = useState(false);
  const odontogramQuery = useOdontogramQuery(patientId, !demoMode);
  const mutation = useRecordPeriodontalMeasurementMutation(patientId);

  const recordMeasurement = async () => {
    if (demoMode || !tooth.trim()) return;
    await mutation.mutateAsync({
      tooth: tooth.trim(),
      site,
      probingDepth,
      recession,
      bleeding,
      plaque,
    });
  };

  const latest = odontogramQuery.data?.periodontal[0];

  return (
    <section className={styles.section}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>Periodonto rápido</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Una medición por llamada, igual que el endpoint original del odontograma.
          </Text>
        </div>
        <Badge variant="light">{demoMode ? "Demo" : "Servidor"}</Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mt="lg">
        <TextInput
          label="Diente"
          value={tooth}
          onChange={(event) => setTooth(event.currentTarget.value)}
        />
        <Select
          label="Sitio"
          value={site}
          data={[...SITES]}
          onChange={(value) => value && setSite(value as (typeof SITES)[number])}
        />
        <NumberInput
          label="Sondaje (mm)"
          min={0}
          max={20}
          value={probingDepth}
          onChange={(value) => setProbingDepth(numberValue(value))}
        />
        <NumberInput
          label="Recesión (mm)"
          min={-10}
          max={20}
          value={recession}
          onChange={(value) => setRecession(numberValue(value))}
        />
      </SimpleGrid>

      <Group mt="lg">
        <Checkbox
          checked={bleeding}
          onChange={(event) => setBleeding(event.currentTarget.checked)}
          label="Sangrado"
        />
        <Checkbox
          checked={plaque}
          onChange={(event) => setPlaque(event.currentTarget.checked)}
          label="Placa"
        />
        <Button
          size="xs"
          loading={mutation.isPending}
          disabled={demoMode || !tooth.trim()}
          onClick={() => void recordMeasurement()}
        >
          Registrar medición
        </Button>
      </Group>

      {mutation.isError ? (
        <Alert mt="lg" color="red" title="No se guardó la medición">
          El odontograma conserva la versión previa; no se ha escrito un valor local.
        </Alert>
      ) : null}

      {!demoMode && latest ? (
        <Alert mt="lg" color="green" title="Última medición">
          Diente {latest.tooth} · {latest.site} · PD {latest.probingDepth ?? "—"} mm · recesión{" "}
          {latest.recession ?? "—"} mm
        </Alert>
      ) : null}
    </section>
  );
}
