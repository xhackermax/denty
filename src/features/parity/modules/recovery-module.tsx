"use client";

import { Alert, Badge, Button, Group, Pagination, SegmentedControl, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import styles from "@/shared/ui/parity.module.css";

type RecoveryKind = "ALL" | "RECALL" | "PLAN" | "BUDGET";

const KIND_LABELS: Record<Exclude<RecoveryKind, "ALL">, string> = {
  RECALL: "Revisión pendiente",
  PLAN: "Tratamiento sin cita",
  BUDGET: "Presupuesto sin respuesta",
};
const PAGE_SIZE = 25;

function dateLabel(value: string) {
  const ms = Date.parse(value);
  return Number.isFinite(ms)
    ? new Date(ms).toLocaleDateString("es-ES", {
        timeZone: "Europe/Madrid", day: "2-digit", month: "short", year: "numeric",
      })
    : "Fecha no disponible";
}

export function RecoveryModule() {
  const [kind, setKind] = useState<RecoveryKind>("ALL");
  const [page, setPage] = useState(1);

  const totals = useQuery({
    queryKey: ["recovery", "overview"],
    queryFn: () => getBrowserApi().engagement.communications.recoveryWorklist({
      kind: "ALL", page: 1, pageSize: 1,
    }),
    staleTime: 30_000,
  });
  const worklist = useQuery({
    queryKey: ["recovery", "worklist", kind, page],
    queryFn: () => getBrowserApi().engagement.communications.recoveryWorklist({
      kind, page, pageSize: PAGE_SIZE,
    }),
  });

  const changeKind = (next: string) => {
    setKind(next as RecoveryKind);
    setPage(1);
  };

  return (
    <Stack gap="md">
      <section className={styles.section}>
        <Text fw={600}>Cola de seguimiento de pacientes</Text>
        <Text c="dimmed" size="sm" mt="xs">
          Una ficha por paciente, aunque tenga varios motivos de seguimiento.
          Los importes indicados son referencias del plan o presupuesto,
          no facturación ni dinero recuperado. No se envían mensajes automáticamente.
        </Text>
        {totals.isError ? (
          <Alert color="red" mt="md">No se pudieron consultar los contadores.</Alert>
        ) : null}
        <Group gap="sm" mt="md" wrap="wrap">
          <Badge size="lg" variant="light">
            {totals.data?.total ?? "…"} pacientes en seguimiento
          </Badge>
          <Badge variant="light" color="orange">
            {totals.data?.counts.RECALL ?? 0} revisiones
          </Badge>
          <Badge variant="light" color="cyan">
            {totals.data?.counts.PLAN ?? 0} tratamientos
          </Badge>
          <Badge variant="light" color="violet">
            {totals.data?.counts.BUDGET ?? 0} presupuestos
          </Badge>
        </Group>
      </section>

      <section className={styles.section}>
        <Text fw={600} mb="sm">Lista de trabajo</Text>
        <SegmentedControl
          fullWidth
          size="sm"
          aria-label="Filtro de recuperación"
          value={kind}
          onChange={changeKind}
          data={[
            { value: "ALL", label: "Todos" },
            { value: "RECALL", label: "Revisiones" },
            { value: "PLAN", label: "Tratamientos" },
            { value: "BUDGET", label: "Presupuestos" },
          ]}
        />
        {worklist.isPending ? (
          <Text mt="md" c="dimmed">Consultando revisiones y tratamientos pendientes…</Text>
        ) : worklist.isError ? (
          <Alert mt="md" color="red">
            No se pudo cargar la lista. Comprueba los permisos y la conexión con Supabase.
          </Alert>
        ) : worklist.data.items.length === 0 ? (
          <Text mt="md" c="dimmed">
            No hay pacientes que cumplan los criterios de esta lista.
          </Text>
        ) : (
          <div className={styles.rowList}>
            {worklist.data.items.map((patient) => (
              <div className={styles.row} key={patient.patientId}>
                <div className={styles.rowMain}>
                  <span className={styles.rowTitle}>{patient.patientName}</span>
                  <span className={styles.rowMeta}>
                    {KIND_LABELS[patient.kind]} · {patient.label} · {dateLabel(patient.dueAt)}
                  </span>
                  <Group gap={4} mt={4}>
                    {patient.kinds.length > 1 ? patient.kinds.map((reason) => (
                      <Badge key={reason} size="xs" variant="outline">
                        {KIND_LABELS[reason]}
                      </Badge>
                    )) : null}
                  </Group>
                </div>
                <div className={styles.rowActions}>
                  <Button
                    component={Link}
                    href={`/app/patients/${encodeURIComponent(patient.patientId)}?view=${patient.kind === "BUDGET" ? "budgets" : "clinical"}`}
                    size="xs"
                    variant="light"
                  >
                    Abrir ficha
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {worklist.data && worklist.data.total > PAGE_SIZE ? (
          <Group justify="center" mt="md">
            <Pagination
              value={page}
              total={Math.ceil(worklist.data.total / PAGE_SIZE)}
              onChange={setPage}
            />
          </Group>
        ) : null}
      </section>
      <Alert color="blue">
        Primera fase: identificación y priorización. Las acciones «Llamar», «Posponer»,
        «Reservar cita» y el registro de cada intento de contacto se incorporarán
        cuando el seguimiento tenga trazabilidad y permisos en Supabase.
      </Alert>
    </Stack>
  );
}
