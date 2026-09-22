"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useMemo, useState } from "react";

import {
  canIssuePrescription,
  canTransitionPrescription,
  type PrescriptionState,
} from "@/domain/state-machines";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import type { Prescription } from "@/shared/api";
import { publicEnv } from "@/shared/config/env";

import { DEMO_PATIENTS, DEMO_STAFF } from "@/shared/demo/demo-data";
import styles from "@/shared/ui/parity.module.css";
import {
  openPrescriptionPdf,
  useCancelPrescriptionMutation,
  useCreatePrescriptionMutation,
  useIssuePrescriptionMutation,
  usePrescriptionsQuery,
  usePrescriptionSettingsQuery,
  useValidatePrescriptionMutation,
} from "./prescriptions-data";

interface MedicationDraft {
  activeIngredient: string;
  brandName: string;
  strength: string;
  pharmaceuticalForm: string;
  unitsPerDose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface DemoPrescriptionRow {
  id: string;
  patientId: string;
  patientName: string;
  prescriberId: string;
  prescriberName: string;
  status: PrescriptionState;
  medication: MedicationDraft;
  cancellationReason?: string;
}

const INITIAL_ROWS: readonly DemoPrescriptionRow[] = [
  {
    id: "RX-2031",
    patientId: "maria-lopez",
    patientName: "María López",
    prescriberId: "maximo",
    prescriberName: "Máximo Tiburcio",
    status: "READY",
    medication: {
      activeIngredient: "Ibuprofeno",
      brandName: "Ibuprofeno",
      strength: "600 mg",
      pharmaceuticalForm: "Comprimidos",
      unitsPerDose: "1 comprimido",
      frequency: "Cada 8 horas",
      duration: "3 días",
      instructions: "Tomar con alimentos.",
    },
  },
  {
    id: "RX-2032",
    patientId: "juan-perez",
    patientName: "Juan Pérez",
    prescriberId: "isaac",
    prescriberName: "Isaac Tiburcio",
    status: "DRAFT",
    medication: {
      activeIngredient: "Amoxicilina",
      brandName: "Amoxicilina",
      strength: "500 mg",
      pharmaceuticalForm: "Cápsulas",
      unitsPerDose: "1 cápsula",
      frequency: "Cada 8 horas",
      duration: "7 días",
      instructions: "Completar la pauta prescrita.",
    },
  },
];

const EMPTY_MEDICATION: MedicationDraft = {
  activeIngredient: "",
  brandName: "",
  strength: "",
  pharmaceuticalForm: "",
  unitsPerDose: "",
  frequency: "",
  duration: "",
  instructions: "",
};

function statusLabel(status: Prescription["status"]): string {
  const labels: Record<Prescription["status"], string> = {
    DRAFT: "Borrador",
    READY: "Lista para emitir",
    SIGNING: "Firmando",
    ISSUED: "Emitida",
    DISPENSED_PARTIAL: "Dispensación parcial",
    DISPENSED: "Dispensada",
    CANCELLED: "Anulada",
    FAILED: "Error de emisión",
    EXPIRED: "Caducada",
  };
  return labels[status];
}

function statusColor(status: Prescription["status"]): string {
  if (["ISSUED", "DISPENSED", "DISPENSED_PARTIAL"].includes(status)) return "green";
  if (["CANCELLED", "FAILED", "EXPIRED"].includes(status)) return "red";
  if (status === "READY" || status === "SIGNING") return "blue";
  return "gray";
}

export function PrescriptionsModule() {
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const [demoRows, setDemoRows] = useState<DemoPrescriptionRow[]>(() => [
    ...INITIAL_ROWS,
  ]);
  const [opened, setOpened] = useState(false);
  const [cancelOpened, setCancelOpened] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState(demoMode ? "juan-perez" : "");
  const [prescriberId, setPrescriberId] = useState(demoMode ? "maximo" : "");
  const [medication, setMedication] = useState<MedicationDraft>(EMPTY_MEDICATION);
  const [cancellationReason, setCancellationReason] = useState("");
  const [pdfError, setPdfError] = useState(false);

  const prescriptionsQuery = usePrescriptionsQuery(!demoMode);
  const settingsQuery = usePrescriptionSettingsQuery(!demoMode);
  const patientsQuery = usePatientsQuery(!demoMode);
  const createMutation = useCreatePrescriptionMutation();
  const validateMutation = useValidatePrescriptionMutation();
  const issueMutation = useIssuePrescriptionMutation();
  const cancelMutation = useCancelPrescriptionMutation();

  const patientNames = useMemo(
    () =>
      new Map(
        (patientsQuery.data?.items ?? []).map((patient) => [
          patient.id,
          `${patient.firstName} ${patient.lastName}`.trim(),
        ]),
      ),
    [patientsQuery.data?.items],
  );
  const prescriberNames = useMemo(
    () =>
      new Map(
        (settingsQuery.data?.staff ?? []).map((staff) => [staff.id, staff.displayName]),
      ),
    [settingsQuery.data?.staff],
  );
  const providerEnabled = settingsQuery.data?.settings?.providerEnabled === true;

  const saveDraft = async () => {
    if (!medication.activeIngredient.trim() || !medication.brandName.trim()) return;
    if (!medication.strength.trim() || !medication.pharmaceuticalForm.trim()) return;
    if (!medication.unitsPerDose.trim() || !medication.frequency.trim()) return;
    if (!medication.duration.trim()) return;

    if (demoMode) {
      const patient = DEMO_PATIENTS.find((item) => item.id === patientId);
      const prescriber = DEMO_STAFF.find((item) => item.id === prescriberId);
      if (!patient || !prescriber) return;
      setDemoRows((current) => [
        {
          id: `RX-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
          patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          prescriberId,
          prescriberName: prescriber.displayName,
          status: "DRAFT",
          medication: { ...medication },
        },
        ...current,
      ]);
    } else {
      if (!patientId || !prescriberId) return;
      await createMutation.mutateAsync({
        patientId,
        prescriberStaffId: prescriberId,
        items: [{ ...medication }],
      });
    }
    setMedication(EMPTY_MEDICATION);
    setOpened(false);
  };

  const transitionDemo = (id: string, to: PrescriptionState) => {
    setDemoRows((current) =>
      current.map((row) => {
        if (row.id !== id || !canTransitionPrescription(row.status, to)) return row;
        if (
          to === "ISSUED" &&
          !canIssuePrescription({
            state: row.status,
            patientId: row.patientId,
            prescriberId: row.prescriberId,
            medicationCount: 1,
          })
        ) {
          return row;
        }
        return { ...row, status: to };
      }),
    );
  };

  const cancel = async () => {
    if (!selectedId || !cancellationReason.trim()) return;
    if (demoMode) {
      setDemoRows((current) =>
        current.map((row) =>
          row.id === selectedId && canTransitionPrescription(row.status, "CANCELLED")
            ? {
                ...row,
                status: "CANCELLED",
                cancellationReason: cancellationReason.trim(),
              }
            : row,
        ),
      );
    } else {
      await cancelMutation.mutateAsync({
        id: selectedId,
        reason: cancellationReason.trim(),
      });
    }
    setCancellationReason("");
    setSelectedId(null);
    setCancelOpened(false);
  };

  const openPdf = async (id: string) => {
    setPdfError(false);
    try {
      await openPrescriptionPdf(id);
    } catch {
      setPdfError(true);
    }
  };

  const hasServerError =
    !demoMode &&
    (prescriptionsQuery.isError ||
      settingsQuery.isError ||
      patientsQuery.isError ||
      createMutation.isError ||
      validateMutation.isError ||
      issueMutation.isError ||
      cancelMutation.isError);

  return (
    <>
      {!demoMode && !providerEnabled ? (
        <Alert color="yellow" title="Proveedor electrónico no habilitado" mb="md">
          El PDF local y la validación siguen disponibles. La emisión electrónica permanece
          deshabilitada hasta que el servidor confirme la integración del proveedor.
        </Alert>
      ) : null}
      {hasServerError ? (
        <Alert color="red" title="Recetas no disponibles" mb="md">
          No se han sustituido recetas, prescriptores ni configuración por datos demo.
        </Alert>
      ) : null}
      {pdfError ? (
        <Alert color="red" title="No se pudo abrir el PDF" mb="md">
          El documento imprimible no pudo descargarse desde el servidor.
        </Alert>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <h2 className={styles.sectionTitle}>Historial de recetas</h2>
            <p className={styles.sectionDescription}>
              Borrador, validación, PDF local, emisión electrónica y anulación trazable.
            </p>
          </div>
          <Group>
            <Badge variant="light">{demoMode ? "Demo" : "Servidor"}</Badge>
            <Button size="xs" onClick={() => setOpened(true)}>
              Nueva receta
            </Button>
          </Group>
        </div>

        <div className={styles.rowList}>
          {demoMode
            ? demoRows.map((row) => (
                <div className={styles.row} key={row.id}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>
                      {row.patientName} · {row.medication.brandName}{" "}
                      {row.medication.strength}
                    </span>
                    <span className={styles.rowMeta}>
                      {row.id} · {row.medication.unitsPerDose} ·{" "}
                      {row.medication.frequency} · {row.medication.duration}
                    </span>
                    <span className={styles.rowMeta}>
                      Prescriptor: {row.prescriberName}
                    </span>
                    {row.cancellationReason ? (
                      <span className={styles.rowMeta}>
                        Anulación: {row.cancellationReason}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.rowActions}>
                    <Badge color={statusColor(row.status)} variant="light">
                      {statusLabel(row.status)}
                    </Badge>
                    {row.status === "DRAFT" ? (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => transitionDemo(row.id, "READY")}
                      >
                        Validar
                      </Button>
                    ) : null}
                    {row.status === "READY" ? (
                      <Button size="xs" variant="light" disabled>
                        PDF solo en servidor
                      </Button>
                    ) : null}
                    {row.status !== "CANCELLED" ? (
                      <Button
                        size="xs"
                        color="red"
                        variant="subtle"
                        onClick={() => {
                          setSelectedId(row.id);
                          setCancelOpened(true);
                        }}
                      >
                        Anular
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            : (prescriptionsQuery.data?.items ?? []).map((row) => {
                const item = row.items[0];
                const patientName = patientNames.get(row.patientId) ?? row.patientId;
                const prescriberName = row.prescriberStaffId
                  ? (prescriberNames.get(row.prescriberStaffId) ?? row.prescriberStaffId)
                  : "Prescriptor no identificado";
                const canCancel = !["CANCELLED", "DISPENSED", "EXPIRED"].includes(
                  row.status,
                );
                return (
                  <div className={styles.row} key={row.id}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {patientName} · {item?.brandName ?? item?.activeIngredient ?? "Receta"}{" "}
                        {item?.strength ?? ""}
                      </span>
                      <span className={styles.rowMeta}>
                        {row.id} · {item?.unitsPerDose ?? "—"} ·{" "}
                        {item?.frequency ?? "—"} · {item?.duration ?? "—"}
                      </span>
                      <span className={styles.rowMeta}>
                        Prescriptor: {prescriberName}
                      </span>
                    </div>
                    <div className={styles.rowActions}>
                      <Badge color={statusColor(row.status)} variant="light">
                        {statusLabel(row.status)}
                      </Badge>
                      {row.status === "DRAFT" ? (
                        <Button
                          size="xs"
                          variant="light"
                          loading={validateMutation.isPending}
                          onClick={() => void validateMutation.mutateAsync(row)}
                        >
                          Validar
                        </Button>
                      ) : null}
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => void openPdf(row.id)}
                      >
                        Abrir PDF
                      </Button>
                      {row.status === "READY" ? (
                        <Button
                          size="xs"
                          loading={issueMutation.isPending}
                          disabled={!providerEnabled}
                          onClick={() => void issueMutation.mutateAsync(row)}
                        >
                          Emitir electrónicamente
                        </Button>
                      ) : null}
                      {canCancel ? (
                        <Button
                          size="xs"
                          color="red"
                          variant="subtle"
                          onClick={() => {
                            setSelectedId(row.id);
                            setCancelOpened(true);
                          }}
                        >
                          Anular
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
        </div>
      </section>

      <Modal opened={opened} onClose={() => setOpened(false)} title="Nueva receta">
        <Stack>
          <Select
            searchable
            label="Paciente"
            value={patientId}
            onChange={(value) => setPatientId(value ?? "")}
            data={
              demoMode
                ? DEMO_PATIENTS.map((patient) => ({
                    value: patient.id,
                    label: `${patient.firstName} ${patient.lastName}`,
                  }))
                : (patientsQuery.data?.items ?? []).map((patient) => ({
                    value: patient.id,
                    label: `${patient.firstName} ${patient.lastName}`.trim(),
                  }))
            }
          />
          <Select
            searchable
            label="Odontólogo prescriptor"
            value={prescriberId}
            onChange={(value) => setPrescriberId(value ?? "")}
            data={
              demoMode
                ? DEMO_STAFF.map((staff) => ({
                    value: staff.id,
                    label: staff.displayName,
                  }))
                : (settingsQuery.data?.staff ?? []).map((staff) => ({
                    value: staff.id,
                    label: staff.displayName,
                  }))
            }
          />
          <TextInput
            label="Nombre comercial"
            value={medication.brandName}
            onChange={(event) =>
              setMedication((current) => ({
                ...current,
                brandName: event.currentTarget.value,
              }))
            }
          />
          <TextInput
            label="Principio activo"
            value={medication.activeIngredient}
            onChange={(event) =>
              setMedication((current) => ({
                ...current,
                activeIngredient: event.currentTarget.value,
              }))
            }
          />
          <Group grow>
            <TextInput
              label="Dosis"
              value={medication.strength}
              onChange={(event) =>
                setMedication((current) => ({
                  ...current,
                  strength: event.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="Forma"
              value={medication.pharmaceuticalForm}
              onChange={(event) =>
                setMedication((current) => ({
                  ...current,
                  pharmaceuticalForm: event.currentTarget.value,
                }))
              }
            />
          </Group>
          <TextInput
            label="Unidades por toma"
            value={medication.unitsPerDose}
            onChange={(event) =>
              setMedication((current) => ({
                ...current,
                unitsPerDose: event.currentTarget.value,
              }))
            }
          />
          <Group grow>
            <TextInput
              label="Frecuencia"
              value={medication.frequency}
              onChange={(event) =>
                setMedication((current) => ({
                  ...current,
                  frequency: event.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="Duración"
              value={medication.duration}
              onChange={(event) =>
                setMedication((current) => ({
                  ...current,
                  duration: event.currentTarget.value,
                }))
              }
            />
          </Group>
          <Textarea
            label="Instrucciones"
            value={medication.instructions}
            onChange={(event) =>
              setMedication((current) => ({
                ...current,
                instructions: event.currentTarget.value,
              }))
            }
          />
          <Text size="xs" c="dimmed">
            El PDF local y la emisión electrónica son operaciones distintas.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>
              Cancelar
            </Button>
            <Button loading={createMutation.isPending} onClick={() => void saveDraft()}>
              Guardar borrador
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={cancelOpened}
        onClose={() => setCancelOpened(false)}
        title="Anular receta"
      >
        <Stack>
          <Textarea
            label="Motivo de anulación"
            value={cancellationReason}
            onChange={(event) => setCancellationReason(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCancelOpened(false)}>
              Volver
            </Button>
            <Button
              color="red"
              loading={cancelMutation.isPending}
              onClick={() => void cancel()}
            >
              Anular y conservar historial
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
