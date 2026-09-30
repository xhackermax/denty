"use client";

import { Badge, Button, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";
import { ActionErrorAlert } from "./modules/action-error-alert";

const QUICK_ACTIONS = [
  ["Crear paciente", "Alta y ficha clínica", "/app/patients"],
  ["Crear cita", "Abrir agenda", "/app/agenda"],
  ["Emitir receta", "Abrir recetas", "/app/prescriptions"],
  ["Registrar cobro", "Abrir finanzas", "/app/finance"],
  ["Recibir laboratorio", "Abrir trabajos de laboratorio", "/app/laboratory"],
] as const;

export function TasksPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const tasks = useQuery({
    queryKey: dentyQueryKeys.tasks.all,
    queryFn: () => getBrowserApi().tasks.list(),
  });
  const create = useMutation({
    mutationFn: () => getBrowserApi().tasks.create({ title: title.trim(), priority }),
    onSuccess: () => {
      setTitle("");
      void qc.invalidateQueries({ queryKey: dentyQueryKeys.tasks.all });
    },
  });
  const update = useMutation({
    mutationFn: (input: {
      id: string;
      status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
      version: number;
    }) =>
      getBrowserApi().tasks.update(input.id, {
        status: input.status,
        expectedVersion: input.version,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: dentyQueryKeys.tasks.all }),
  });

  return (
    <Stack gap="md">
      <ActionErrorAlert errors={[create.error, update.error, tasks.error]} />
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
        <Text fw={700}>Tareas persistentes</Text>
        <Group mt="sm" align="end">
          <TextInput
            className={styles.flexField}
            label="Nueva tarea"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
          <Select
            label="Prioridad"
            data={["LOW", "NORMAL", "HIGH", "URGENT"]}
            value={priority}
            onChange={(value) => setPriority((value ?? "NORMAL") as typeof priority)}
          />
          <Button
            disabled={!title.trim()}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            Crear
          </Button>
        </Group>
        <div className={styles.rowList}>
          {(tasks.data?.items ?? []).map((task) => (
            <div className={styles.row} key={task.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{task.title}</span>
                <span className={styles.rowMeta}>{task.description ?? "Sin detalle"}</span>
              </div>
              <Group>
                <Badge>{task.priority}</Badge>
                <Select
                  size="xs"
                  data={["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]}
                  value={task.status}
                  onChange={(value) =>
                    value &&
                    update.mutate({ id: task.id, status: value as never, version: task.version })
                  }
                />
              </Group>
            </div>
          ))}
        </div>
      </section>
    </Stack>
  );
}
