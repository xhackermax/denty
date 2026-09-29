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
import { useState } from "react";

import type { Prescription } from "@/shared/api";
import { usePatientsQuery } from "@/shared/patients/patient-data";
import styles from "@/shared/ui/parity.module.css";
import { SignaturePad } from "@/shared/ui/signature-pad";
import {
  openPrescriptionPdf,
  useCancelPrescriptionMutation,
  useCreatePrescriptionMutation,
  useIssuePrescriptionMutation,
  usePrescriptionHistoryQuery,
  usePrescriptionSettingsQuery,
  usePrescriptionsQuery,
  useSignPrescriptionMutation,
  useUpdatePrescriptionMutation,
  useValidatePrescriptionMutation,
} from "./prescriptions-data";

type MedicationDraft = {
  activeIngredient: string;
  strength: string;
  pharmaceuticalForm: string;
  route: string;
  unitsPerDose: string;
  frequency: string;
  duration: string;
  instructions: string;
};

const emptyMedication = (): MedicationDraft => ({
  activeIngredient: "",
  strength: "",
  pharmaceuticalForm: "",
  route: "",
  unitsPerDose: "",
  frequency: "",
  duration: "",
  instructions: "",
});

export function PrescriptionsModule() {
  const prescriptions = usePrescriptionsQuery();
  const settings = usePrescriptionSettingsQuery();
  const patients = usePatientsQuery();
  const create = useCreatePrescriptionMutation();
  const cancel = useCancelPrescriptionMutation();
  const update = useUpdatePrescriptionMutation();
  const validate = useValidatePrescriptionMutation();
  const sign = useSignPrescriptionMutation();
  const issue = useIssuePrescriptionMutation();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [prescriberId, setPrescriberId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Prescription | null>(null);
  const [medication, setMedication] = useState<MedicationDraft>(emptyMedication);
  const [signing, setSigning] = useState<Prescription | null>(null);
  const [cancelling, setCancelling] = useState<Prescription | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [historyId, setHistoryId] = useState<string | null>(null);
  const history = usePrescriptionHistoryQuery(historyId);
  const [signerName, setSignerName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const hasError = prescriptions.isError || settings.isError || patients.isError;

  const openEditor = (prescription: Prescription) => {
    const first = prescription.items[0];
    setEditing(prescription);
    setMedication(
      first
        ? {
            activeIngredient: first.activeIngredient ?? first.brandName ?? "",
            strength: first.strength,
            pharmaceuticalForm: first.pharmaceuticalForm,
            route: first.route ?? "",
            unitsPerDose: first.unitsPerDose,
            frequency: first.frequency,
            duration: first.duration,
            instructions: first.instructions ?? "",
          }
        : emptyMedication(),
    );
  };

  const saveMedication = () => {
    if (!editing) return;
    update.mutate(
      {
        id: editing.id,
        payload: {
          items: [
            {
              activeIngredient: medication.activeIngredient.trim(),
              strength: medication.strength.trim(),
              pharmaceuticalForm: medication.pharmaceuticalForm.trim(),
              ...(medication.route.trim() ? { route: medication.route.trim() } : {}),
              unitsPerDose: medication.unitsPerDose.trim(),
              frequency: medication.frequency.trim(),
              duration: medication.duration.trim(),
              ...(medication.instructions.trim()
                ? { instructions: medication.instructions.trim() }
                : {}),
            },
          ],
        },
      },
      { onSuccess: () => setEditing(null) },
    );
  };

  const medicationComplete =
    medication.activeIngredient.trim().length > 0 &&
    medication.strength.trim().length > 0 &&
    medication.pharmaceuticalForm.trim().length > 0 &&
    medication.unitsPerDose.trim().length > 0 &&
    medication.frequency.trim().length > 0 &&
    medication.duration.trim().length > 0;

  return (
    <Stack gap="md">
      {hasError ? (
        <Alert color="red">No se pudieron cargar todos los datos de recetas.</Alert>
      ) : null}
      {settings.data && !settings.data.settings?.providerEnabled ? (
        <Alert color="yellow">
          El proveedor de receta electrónica todavía no está habilitado para la clínica. Las recetas
          internas siguen pudiendo prepararse, firmarse y conservarse en Denty.
        </Alert>
      ) : null}

      <section className={styles.section}>
        <Group justify="space-between">
          <div>
            <h3 className={styles.sectionTitle}>Nueva receta</h3>
            <p className={styles.sectionDescription}>Borrador persistido en Supabase.</p>
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
                <span className={styles.rowMeta}>
                  {prescription.items.length} medicamento
                  {prescription.items.length === 1 ? "" : "s"}
                </span>
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
                <Button size="xs" variant="subtle" onClick={() => setHistoryId(prescription.id)}>
                  Historial
                </Button>
                {prescription.status !== "CANCELLED" ? (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    onClick={() => {
                      setCancelling(prescription);
                      setCancelReason("");
                    }}
                  >
                    Cancelar receta
                  </Button>
                ) : null}
                {prescription.status === "DRAFT" ? (
                  <>
                    <Button size="xs" variant="light" onClick={() => openEditor(prescription)}>
                      Medicación
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      disabled={prescription.items.length === 0}
                      onClick={() => validate.mutate(prescription)}
                    >
                      Validar
                    </Button>
                  </>
                ) : null}
                {prescription.status === "READY" ? (
                  <Button
                    size="xs"
                    onClick={() => {
                      setSigning(prescription);
                      setSignerName("");
                      setSignatureDataUrl(null);
                    }}
                  >
                    Firmar receta
                  </Button>
                ) : null}
                {prescription.status === "SIGNING" ? (
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

      <Modal
        opened={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Medicación de la receta"
        centered
      >
        <Stack gap="sm">
          <TextInput
            label="Principio activo"
            value={medication.activeIngredient}
            onChange={(event) =>
              setMedication((current) => ({
                ...current,
                activeIngredient: event.currentTarget.value,
              }))
            }
            required
          />
          <TextInput
            label="Dosis"
            placeholder="500 mg"
            value={medication.strength}
            onChange={(event) =>
              setMedication((current) => ({ ...current, strength: event.currentTarget.value }))
            }
            required
          />
          <TextInput
            label="Forma farmacéutica"
            placeholder="Comprimidos"
            value={medication.pharmaceuticalForm}
            onChange={(event) =>
              setMedication((current) => ({
                ...current,
                pharmaceuticalForm: event.currentTarget.value,
              }))
            }
            required
          />
          <TextInput
            label="Vía"
            placeholder="Oral"
            value={medication.route}
            onChange={(event) =>
              setMedication((current) => ({ ...current, route: event.currentTarget.value }))
            }
          />
          <TextInput
            label="Unidades por toma"
            placeholder="1 comprimido"
            value={medication.unitsPerDose}
            onChange={(event) =>
              setMedication((current) => ({ ...current, unitsPerDose: event.currentTarget.value }))
            }
            required
          />
          <TextInput
            label="Frecuencia"
            placeholder="Cada 8 horas"
            value={medication.frequency}
            onChange={(event) =>
              setMedication((current) => ({ ...current, frequency: event.currentTarget.value }))
            }
            required
          />
          <TextInput
            label="Duración"
            placeholder="7 días"
            value={medication.duration}
            onChange={(event) =>
              setMedication((current) => ({ ...current, duration: event.currentTarget.value }))
            }
            required
          />
          <Textarea
            label="Indicaciones"
            value={medication.instructions}
            onChange={(event) =>
              setMedication((current) => ({ ...current, instructions: event.currentTarget.value }))
            }
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!medicationComplete}
              loading={update.isPending}
              onClick={saveMedication}
            >
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={Boolean(signing)}
        onClose={() => setSigning(null)}
        title="Firmar receta"
        centered
      >
        <Stack gap="sm">
          <TextInput
            label="Nombre del firmante"
            value={signerName}
            onChange={(event) => setSignerName(event.currentTarget.value)}
            required
          />
          <SignaturePad label="Firma del prescriptor" onChange={setSignatureDataUrl} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSigning(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!signing || !signerName.trim() || !signatureDataUrl}
              loading={sign.isPending}
              onClick={() => {
                if (!signing || !signatureDataUrl) return;
                sign.mutate(
                  { id: signing.id, payload: { signerName: signerName.trim(), signatureDataUrl } },
                  { onSuccess: () => setSigning(null) },
                );
              }}
            >
              Guardar firma
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        title="Cancelar receta"
        centered
      >
        <Stack gap="sm">
          <Textarea
            label="Motivo de cancelación"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.currentTarget.value)}
            required
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCancelling(null)}>
              Volver
            </Button>
            <Button
              color="red"
              disabled={!cancelling || !cancelReason.trim()}
              loading={cancel.isPending}
              onClick={() => {
                if (!cancelling) return;
                cancel.mutate(
                  { id: cancelling.id, reason: cancelReason.trim() },
                  { onSuccess: () => setCancelling(null) },
                );
              }}
            >
              Confirmar cancelación
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={Boolean(historyId)}
        onClose={() => setHistoryId(null)}
        title="Historial de receta"
        centered
      >
        <Stack gap="sm">
          {history.isLoading ? <Text c="dimmed">Cargando historial…</Text> : null}
          {history.isError ? <Alert color="red">No se pudo cargar el historial.</Alert> : null}
          {(history.data?.items ?? []).map((version) => (
            <div className={styles.row} key={version.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>Versión {version.version}</span>
                <span className={styles.rowMeta}>
                  {version.status} · {version.createdAt}
                </span>
              </div>
              <Badge variant="light">{version.contentHash.slice(0, 10)}…</Badge>
            </div>
          ))}
          {(history.data?.signatures ?? []).map((signature) => (
            <Text size="sm" key={signature.id}>
              Firma: {signature.signerName} · {signature.signedAt}
            </Text>
          ))}
        </Stack>
      </Modal>
    </Stack>
  );
}
