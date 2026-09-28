"use client";

import { Alert, Badge, Button, Group, Select, Stack, Text } from "@mantine/core";
import { useState } from "react";

import { usePatientsQuery } from "@/shared/patients/patient-data";
import styles from "@/shared/ui/parity.module.css";
import {
  openPrescriptionPdf,
  useCreatePrescriptionMutation,
  useIssuePrescriptionMutation,
  usePrescriptionSettingsQuery,
  usePrescriptionsQuery,
  useValidatePrescriptionMutation,
} from "./prescriptions-data";

export function PrescriptionsModule() {
  const prescriptions = usePrescriptionsQuery();
  const settings = usePrescriptionSettingsQuery();
  const patients = usePatientsQuery();
  const create = useCreatePrescriptionMutation();
  const validate = useValidatePrescriptionMutation();
  const issue = useIssuePrescriptionMutation();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [prescriberId, setPrescriberId] = useState<string | null>(null);
  const hasError = prescriptions.isError || settings.isError || patients.isError;

  return (
    <Stack gap="md">
      {hasError ? <Alert color="red">No se pudieron cargar todos los datos de recetas.</Alert> : null}
      {settings.data && !settings.data.settings?.providerEnabled ? (
        <Alert color="yellow">
          El proveedor de receta electrónica todavía no está habilitado para la clínica.
        </Alert>
      ) : null}

      <section className={styles.section}>
        <Group justify="space-between">
          <div>
            <h3 className={styles.sectionTitle}>Nueva receta</h3>
            <p className={styles.sectionDescription}>Borrador persistido en el servidor.</p>
          </div>
          <Badge variant="light">Servidor</Badge>
        </Group>
        <Group grow mt="md" align="end">
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
          <Select
            searchable
            clearable
            label="Prescriptor"
            value={prescriberId}
            onChange={setPrescriberId}
            data={(settings.data?.staff ?? []).map((staff) => ({
              value: staff.id,
              label: staff.displayName,
            }))}
          />
          <Button
            disabled={!patientId || !prescriberId}
            loading={create.isPending}
            onClick={() => {
              if (!patientId || !prescriberId) return;
              create.mutate({ patientId, prescriberStaffId: prescriberId, items: [] });
            }}
          >
            Crear borrador
          </Button>
        </Group>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Recetas</h3>
        <div className={styles.rowList}>
          {(prescriptions.data?.items ?? []).map((prescription) => (
            <div className={styles.row} key={prescription.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{prescription.id}</span>
                <span className={styles.rowMeta}>{prescription.status}</span>
              </div>
              <div className={styles.rowActions}>
                <Badge>{prescription.status}</Badge>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => void openPrescriptionPdf(prescription.id)}
                >
                  PDF
                </Button>
                {prescription.status === "DRAFT" ? (
                  <Button size="xs" variant="light" onClick={() => validate.mutate(prescription)}>
                    Validar
                  </Button>
                ) : null}
                {prescription.status === "READY" ? (
                  <Button size="xs" onClick={() => issue.mutate(prescription)}>
                    Emitir
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {!prescriptions.isLoading && (prescriptions.data?.items.length ?? 0) === 0 ? (
            <Text c="dimmed">Sin recetas.</Text>
          ) : null}
        </div>
      </section>
    </Stack>
  );
}
