import { Badge, Text } from "@mantine/core";

import styles from "@/shared/ui/parity.module.css";

const STEPS = [
  "Odontograma",
  "Diagnóstico",
  "Plan",
  "Presupuesto",
  "Citas",
] as const;

export function ClinicalPipelineCard({ active = 2 }: { active?: number }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderText}>
          <h2 className={styles.sectionTitle}>Pipeline clínico</h2>
          <p className={styles.sectionDescription}>
            El mismo flujo recuperado de Denty 2.3.6, sin duplicar lógica entre herramientas.
          </p>
        </div>
        <Badge variant="light">Odontograma → citas</Badge>
      </div>
      <div className={styles.pipeline}>
        {STEPS.map((step, index) => (
          <div
            className={`${styles.pipelineStep} ${
              index <= active ? styles.pipelineStepActive : ""
            }`}
            key={step}
          >
            <span className={styles.pipelineNumber}>{index + 1}</span>
            <Text fw={750} size="sm">{step}</Text>
          </div>
        ))}
      </div>
    </section>
  );
}
