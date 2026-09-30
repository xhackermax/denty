"use client";

import { Button, Stack, Text } from "@mantine/core";
import Link from "next/link";

import styles from "@/shared/ui/parity.module.css";
import { TasksTimeline } from "./tasks/tasks-timeline";

const QUICK_ACTIONS = [
  ["Crear paciente", "Alta y ficha clínica", "/app/patients"],
  ["Crear cita", "Abrir agenda", "/app/agenda"],
  ["Emitir receta", "Abrir recetas", "/app/prescriptions"],
  ["Registrar cobro", "Abrir finanzas", "/app/finance"],
  ["Recibir laboratorio", "Abrir trabajos de laboratorio", "/app/laboratory"],
] as const;

export function TasksPage() {
  return (
    <Stack gap="md">
      <section className={styles.section}>
        <Text fw={700}>Acciones rápidas</Text>
        <div className={styles.rowList}>
          {QUICK_ACTIONS.map(([titleText, description, href]) => (
            <div className={styles.row} key={titleText}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{titleText}</span>
                <Text className={styles.rowMeta}>{description}</Text>
              </div>
              <Button component={Link} href={href} size="xs" variant="light">
                Abrir
              </Button>
            </div>
          ))}
        </div>
      </section>
      <section className={styles.section}>
        <TasksTimeline />
      </section>
    </Stack>
  );
}
