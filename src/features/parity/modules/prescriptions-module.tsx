"use client";
import {
  Alert,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconDots, IconFileText, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  canIssuePrescription,
  canTransitionPrescription,
  type PrescriptionState,
} from "@/domain/state-machines";
import type { Prescription } from "@/shared/api";
import { publicEnv } from "@/shared/config/env";
import { DEMO_PATIENTS, DEMO_STAFF } from "@/shared/demo/demo-data";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import { SignaturePad } from "@/shared/ui/signature-pad";
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
  brandName: string;
  strength: string;
  pharmaceuticalForm: string;
  route: string;
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
  signedAt?: string;
  signerName?: string;
  signatureDataUrl?: string;
}
const ROUTES = [
  "Vía oral",
  "Vía tópica",
  "Vía bucal",
  "Vía sublingual",
  "Vía inhalatoria",
  "Vía intramuscular",
  "Vía intravenosa",
  "Otra",
] as const;
const INITIAL_ROWS: readonly DemoPrescriptionRow[] = [
  {
    id: "RX-2031",
    patientId: "maria-lopez",
    patientName: "María López",
    prescriberId: "maximo",
    prescriberName: "Máximo Tiburcio",
    status: "READY",
    medication: {
      brandName: "Ibuprofeno",
      strength: "600 mg",
      pharmaceuticalForm: "Comprimidos",
      route: "Vía oral",
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
      brandName: "Amoxicilina",
      strength: "500 mg",
      pharmaceuticalForm: "Cápsulas",
      route: "Vía oral",
      unitsPerDose: "1 cápsula",
      frequency: "Cada 8 horas",
      duration: "7 días",
      instructions: "Completar la pauta prescrita.",
    },
  },
];
const EMPTY_MEDICATION: MedicationDraft = {
  brandName: "",
  strength: "",
  pharmaceuticalForm: "",
  route: "Vía oral",
  unitsPerDose: "",
  frequency: "",
  duration: "",
  instructions: "",
};
function statusLabel(status: Prescription["status"]): string {
  const labels: Record<Prescription["status"], string> = {
    DRAFT: "Borrador",
    READY: "Lista para firmar",
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
  const [demoRows, setDemoRows] = useState<DemoPrescriptionRow[]>(() => [...INITIAL_ROWS]);
  const [opened, setOpened] = useState(false);
  const [cancelOpened, setCancelOpened] = useState(false);
  const [signatureOpened, setSignatureOpened] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedServerPrescription, setSelectedServerPrescription] = useState<Prescription | null>(
    null,
  );
  const [patientId, setPatientId] = useState(demoMode ? "juan-perez" : "");
  const [prescriberId, setPrescriberId] = useState(demoMode ? "maximo" : "");
  const [medication, setMedication] = useState<MedicationDraft>(EMPTY_MEDICATION);
  const [cancellationReason, setCancellationReason] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
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
    () => new Map((settingsQuery.data?.staff ?? []).map((staff) => [staff.id, staff.displayName])),
    [settingsQuery.data?.staff],
  );
  const providerEnabled = settingsQuery.data?.settings?.providerEnabled === true;
  const saveDraft = async () => {
    if (
      !medication.brandName.trim() ||
      !medication.strength.trim() ||
      !medication.pharmaceuticalForm.trim()
    )
      return;
    if (
      !medication.route ||
      !medication.unitsPerDose.trim() ||
      !medication.frequency.trim() ||
      !medication.duration.trim()
    )
      return;
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
        return { ...row, status: to };
      }),
    );
  };
  const beginSignature = (id: string, serverPrescription?: Prescription) => {
    setSelectedId(id);
    setSelectedServerPrescription(serverPrescription ?? null);
    setSignatureDataUrl(null);
    setSignatureOpened(true);
  };
  const signAndIssue = async () => {
    if (!selectedId || !signatureDataUrl) return;
    if (demoMode) {
      setDemoRows((current) =>
        current.map((row) => {
          if (row.id !== selectedId || !canTransitionPrescription(row.status, "ISSUED")) return row;
          if (
            !canIssuePrescription({
              state: row.status,
              patientId: row.patientId,
              prescriberId: row.prescriberId,
              medicationCount: 1,
            })
          )
            return row;
          return {
            ...row,
            status: "ISSUED",
            signedAt: new Date().toISOString(),
            signerName: row.prescriberName,
            signatureDataUrl,
          };
        }),
      );
    } else if (selectedServerPrescription) {
      await issueMutation.mutateAsync(selectedServerPrescription);
    }
    setSignatureOpened(false);
    setSignatureDataUrl(null);
    setSelectedId(null);
    setSelectedServerPrescription(null);
  };
  const cancel = async () => {
    if (!selectedId || !cancellationReason.trim()) return;
    if (demoMode) {
      setDemoRows((current) =>
        current.map((row) =>
          row.id === selectedId && canTransitionPrescription(row.status, "CANCELLED")
            ? { ...row, status: "CANCELLED", cancellationReason: cancellationReason.trim() }
            : row,
        ),
      );
    } else {
      await cancelMutation.mutateAsync({ id: selectedId, reason: cancellationReason.trim() });
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
          Puedes preparar, firmar y generar el documento local. La emisión electrónica exige que el
          proveedor esté habilitado en servidor.
        </Alert>
      ) : null}
      {hasServerError ? (
        <Alert color="red" title="Recetas no disponibles" mb="md">
          No se han sustituido datos reales por datos demo.
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
              Nombre comercial, vía de administración, firma manuscrita, PDF, emisión y anulación
              trazable.
            </p>
          </div>
          <Button size="xs" onClick={() => setOpened(true)}>
            Nueva receta
          </Button>
        </div>

        <div className={styles.rowList}>
          {demoMode
            ? demoRows.map((row) => (
                <div className={styles.row} key={row.id}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>
                      {row.patientName} ·{row.medication.brandName} {row.medication.strength}
                    </span>
                    <span className={styles.rowMeta}>
                      {row.id} · {row.medication.route} ·{row.medication.unitsPerDose} ·{" "}
                      {row.medication.frequency} ·{row.medication.duration}
                    </span>
                    <span className={styles.rowMeta}>
                      Prescriptor:
                      {row.prescriberName}
                      {row.signedAt
                        ? ` · Firmada ${new Date(row.signedAt).toLocaleString("es-ES")}`
                        : ""}
                    </span>
                    {row.cancellationReason ? (
                      <span className={styles.rowMeta}>
                        Anulación:
                        {row.cancellationReason}
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
                      <Button size="xs" onClick={() => beginSignature(row.id)}>
                        Firmar y emitir
                      </Button>
                    ) : null}
                    {row.status !== "CANCELLED" ? (
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <Button size="xs" variant="subtle" px={8} aria-label="Más acciones">
                            <IconDots size={16} />
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => {
                              setSelectedId(row.id);
                              setCancelOpened(true);
                            }}
                          >
                            Anular receta
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
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
                const canCancel = !["CANCELLED", "DISPENSED", "EXPIRED"].includes(row.status);
                return (
                  <div className={styles.row} key={row.id}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {patientName} · {item?.brandName ?? "Receta"} {item?.strength ?? ""}
                      </span>
                      <span className={styles.rowMeta}>
                        {row.id} · {item?.route ?? "Vía no indicada"} · {item?.unitsPerDose ?? "—"}{" "}
                        · {item?.frequency ?? "—"} · {item?.duration ?? "—"}
                      </span>
                      <span className={styles.rowMeta}>Prescriptor: {prescriberName}</span>
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
                      {row.status === "READY" ? (
                        <Button
                          size="xs"
                          disabled={!providerEnabled}
                          onClick={() => beginSignature(row.id, row)}
                        >
                          Firmar y emitir
                        </Button>
                      ) : null}
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <Button size="xs" variant="subtle" px={8} aria-label="Más acciones">
                            <IconDots size={16} />
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconFileText size={14} />}
                            onClick={() => void openPdf(row.id)}
                          >
                            Abrir PDF
                          </Menu.Item>
                          {canCancel ? (
                            <Menu.Item
                              color="red"
                              leftSection={<IconTrash size={14} />}
                              onClick={() => {
                                setSelectedId(row.id);
                                setCancelOpened(true);
                              }}
                            >
                              Anular receta
                            </Menu.Item>
                          ) : null}
                        </Menu.Dropdown>
                      </Menu>
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
                ? DEMO_STAFF.map((staff) => ({ value: staff.id, label: staff.displayName }))
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
              setMedication((current) => ({ ...current, brandName: event.currentTarget.value }))
            }
          />
          <Group grow>
            <TextInput
              label="Dosis / concentración"
              value={medication.strength}
              onChange={(event) =>
                setMedication((current) => ({ ...current, strength: event.currentTarget.value }))
              }
            />
            <TextInput
              label="Forma farmacéutica"
              value={medication.pharmaceuticalForm}
              onChange={(event) =>
                setMedication((current) => ({
                  ...current,
                  pharmaceuticalForm: event.currentTarget.value,
                }))
              }
            />
          </Group>
          <Select
            label="Forma de administración"
            value={medication.route}
            onChange={(value) =>
              setMedication((current) => ({ ...current, route: value ?? "Vía oral" }))
            }
            data={ROUTES.map((route) => ({ value: route, label: route }))}
          />
          <TextInput
            label="Unidades por toma"
            value={medication.unitsPerDose}
            onChange={(event) =>
              setMedication((current) => ({ ...current, unitsPerDose: event.currentTarget.value }))
            }
          />
          <Group grow>
            <TextInput
              label="Frecuencia"
              value={medication.frequency}
              onChange={(event) =>
                setMedication((current) => ({ ...current, frequency: event.currentTarget.value }))
              }
            />
            <TextInput
              label="Duración"
              value={medication.duration}
              onChange={(event) =>
                setMedication((current) => ({ ...current, duration: event.currentTarget.value }))
              }
            />
          </Group>
          <Textarea
            label="Instrucciones"
            value={medication.instructions}
            onChange={(event) =>
              setMedication((current) => ({ ...current, instructions: event.currentTarget.value }))
            }
          />
          <Text size="xs" c="dimmed">
            El campo «principio activo» se ha eliminado de la interfaz. La receta trabaja con el
            nombre comercial y la pauta.
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
        opened={signatureOpened}
        onClose={() => setSignatureOpened(false)}
        title="Firmar receta"
        size="lg"
      >
        <Stack>
          <Text size="sm">
            Firma la receta antes de emitirla. La demo conserva la evidencia en el estado local;
            producción delega la emisión al proveedor configurado.
          </Text>
          <SignaturePad onChange={setSignatureDataUrl} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSignatureOpened(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!signatureDataUrl}
              loading={issueMutation.isPending}
              onClick={() => void signAndIssue()}
            >
              Firmar y emitir
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={cancelOpened} onClose={() => setCancelOpened(false)} title="Anular receta">
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
            <Button color="red" loading={cancelMutation.isPending} onClick={() => void cancel()}>
              Anular y conservar historial
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
