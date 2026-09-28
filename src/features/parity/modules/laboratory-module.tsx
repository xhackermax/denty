"use client";

import { Alert, Badge, Button, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";

import { formatEUR } from "@/domain/money";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import styles from "@/shared/ui/parity.module.css";
import {
  useCreateLabWorkMutation,
  useLaboratoryQuery,
  useLaboratorySuppliersQuery,
  useLabTransitionMutation,
} from "./laboratory-data";

export function LaboratoryModule() {
  const works = useLaboratoryQuery();
  const suppliers = useLaboratorySuppliersQuery();
  const patients = usePatientsQuery();
  const create = useCreateLabWorkMutation();
  const transition = useLabTransitionMutation();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const hasError = works.isError || suppliers.isError || patients.isError;

  return (
    <Stack gap="md">
      {hasError ? <Alert color="red">No se pudieron cargar todos los datos de laboratorio.</Alert> : null}

      <section className={styles.section}>
        <Group justify="space-between">
          <div>
            <h3 className={styles.sectionTitle}>Nuevo trabajo</h3>
            <p className={styles.sectionDescription}>Persistido en Supabase mediante la API canónica.</p>
          </div>
          <Badge variant="light">Servidor</Badge>
        </Group>
        <Group grow align="end">
          <Select
            searchable
            clearable
            label="Paciente"
            value={patientId}
            onChange={setPatientId}
            data={(patients.data?.items ?? []).map((patient) => ({
              value: patient.id,
              label: `${patient.firstName} ${patient.lastName}`,
            }))}
          />
          <TextInput
            label="Trabajo"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
          <Button
            disabled={!patientId || !title.trim()}
            loading={create.isPending}
            onClick={() => {
              if (!patientId) return;
              create.mutate(
                { patientId, title: title.trim(), costCents: 0 },
                { onSuccess: () => setTitle("") },
              );
            }}
          >
            Crear
          </Button>
        </Group>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h3 className={styles.sectionTitle}>Trabajos</h3>
            <p className={styles.sectionDescription}>Fuente: lab_works.</p>
          </div>
          <Badge>{works.data?.items.length ?? 0}</Badge>
        </div>
        <div className={styles.rowList}>
          {(works.data?.items ?? []).map((work) => (
            <div className={styles.row} key={work.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{work.title}</span>
                <span className={styles.rowMeta}>
                  {work.patient ? `${work.patient.firstName} ${work.patient.lastName}` : "Paciente"}
                  {" · "}
                  {work.lab?.name ?? "Sin laboratorio"} · {formatEUR(work.costCents)}
                </span>
              </div>
              <div className={styles.rowActions}>
                <Badge variant="light">{work.status}</Badge>
                {work.status !== "RECEIVED" &&
                work.status !== "PLACED" &&
                work.status !== "CANCELLED" ? (
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() =>
                      transition.mutate({
                        id: work.id,
                        payload: { status: "RECEIVED", expectedVersion: work.version },
                      })
                    }
                  >
                    Marcar recibido
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {!works.isLoading && (works.data?.items.length ?? 0) === 0 ? (
            <Text c="dimmed">Sin trabajos.</Text>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Proveedores detectados</h3>
        <Text size="sm" c="dimmed">
          El CRUD de maestros de laboratorio se completa en su etapa específica. Aquí solo se muestran registros persistidos.
        </Text>
        <div className={styles.rowList}>
          {(suppliers.data?.items ?? []).map((supplier, index) => (
            <div className={styles.row} key={supplier.id ?? String(index)}>
              <span className={styles.rowTitle}>
                {supplier.name ?? supplier.label ?? supplier.id ?? "Proveedor"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </Stack>
  );
}
