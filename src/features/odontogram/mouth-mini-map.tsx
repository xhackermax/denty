"use client";
import { Badge, Button, Group, Text } from "@mantine/core";
import { teethForChart } from "@/domain/odontogram/mouth-state";
import { useMouthState } from "./mouth-state-context";
const labels = {
  missing: "Ausente",
  implant: "Implante",
  pontic: "Póntico",
  unerupted: "No erupcionado",
  deciduous: "Temporal",
  present: "Presente",
  extracted_planned: "Exodoncia planificada",
};
export function MouthMiniMap({
  selectedTooth,
  onSelect,
}: {
  selectedTooth: string;
  onSelect: (tooth: string) => void;
}) {
  const state = useMouthState();
  return (
    <section aria-label="Mapa compartido de la boca">
      <Text size="xs" c="dimmed">
        Selecciona una pieza · estado compartido entre especialidades
      </Text>
      <Group gap={4}>
        {teethForChart(state, "surgery").map((tooth) => (
          <Button
            key={tooth}
            size="compact-xs"
            variant={selectedTooth === tooth ? "filled" : "light"}
            color={
              state.teeth[tooth]?.presence === "missing"
                ? "gray"
                : state.teeth[tooth]?.presence === "implant"
                  ? "teal"
                  : "blue"
            }
            aria-label={`${tooth}: ${labels[state.teeth[tooth]!.presence]}`}
            aria-pressed={selectedTooth === tooth}
            onClick={() => onSelect(tooth)}
          >
            {tooth}
          </Button>
        ))}
      </Group>
      <Badge size="xs" variant="light">
        Ausentes en gris · implantes en verde
      </Badge>
    </section>
  );
}
