"use client";

import { Alert, Badge, Button, Group, Stack, Text, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChangePasswordForm } from "@/features/auth";
import { usePatientProjectionQuery } from "@/shared/patients/patient-data";
import { formatEUR } from "@/domain/money";
import styles from "@/shared/ui/parity.module.css";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";

async function openPortalPrescriptionPdf(id: string): Promise<void> {
  const blob = await getBrowserApi().prescriptions.pdf(id);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function PatientPortal({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient();
  const projection = usePatientProjectionQuery(patientId);
  const waitlist = useQuery({
    queryKey: dentyQueryKeys.portal.waitlist(patientId),
    queryFn: () => getBrowserApi().agenda.waitlist.list(),
  });
  const activeWaitlist = (waitlist.data?.items ?? []).find(
    (item) => item.patientId === patientId && item.active !== false,
  );
  const joinWaitlist = useMutation({
    mutationFn: () =>
      getBrowserApi().agenda.waitlist.create({
        patientId,
        durationMin: 30,
        priority: 0,
        reason: "Paciente solicita una cita anterior",
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.portal.waitlist(patientId) }),
  });
  const withdrawWaitlist = useMutation({
    mutationFn: (id: string) => getBrowserApi().agenda.waitlist.withdraw(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: dentyQueryKeys.portal.waitlist(patientId) }),
  });
  if (projection.isLoading) return <Text c="dimmed">Cargando portal…</Text>;
  if (projection.isError || !projection.data)
    return <Alert color="red">No se pudo cargar el portal del paciente.</Alert>;
  const data = projection.data;
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>
            {data.patient.firstName} {data.patient.lastName}
          </Title>
          <Text c="dimmed">Portal conectado a la proyección real del paciente.</Text>
        </div>
        <Badge variant="light">Paciente</Badge>
      </Group>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Próximas citas</h3>
        <div className={styles.rowList}>
          {data.appointments.map((appointment) => (
            <div className={styles.row} key={appointment.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{appointment.title}</span>
                <span className={styles.rowMeta}>
                  {new Date(appointment.startsAt).toLocaleString("es-ES")}
                </span>
              </div>
              <Badge>{appointment.status}</Badge>
            </div>
          ))}
          {data.appointments.length === 0 ? <Text c="dimmed">Sin citas.</Text> : null}
        </div>
      </section>
      <section className={styles.section}>
        <Group justify="space-between">
          <div>
            <h3 className={styles.sectionTitle}>Lista de espera</h3>
            <Text size="sm" c="dimmed">
              Te avisaremos si aparece un hueco anterior compatible.
            </Text>
          </div>
          {activeWaitlist ? <Badge color="green">Solicitud activa</Badge> : null}
        </Group>
        {waitlist.isError ? (
          <Alert mt="sm" color="red">
            No se pudo consultar la lista de espera.
          </Alert>
        ) : null}
        <Button
          mt="md"
          variant="light"
          loading={joinWaitlist.isPending || withdrawWaitlist.isPending}
          onClick={() =>
            activeWaitlist ? withdrawWaitlist.mutate(activeWaitlist.id) : joinWaitlist.mutate()
          }
        >
          {activeWaitlist ? "Retirarme de la lista" : "Avisarme si queda un hueco antes"}
        </Button>
      </section>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Presupuestos</h3>
        <div className={styles.rowList}>
          {data.budgets.map((budget) => (
            <div className={styles.row} key={budget.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{formatEUR(budget.totalCents)}</span>
                <span className={styles.rowMeta}>{budget.status}</span>
              </div>
              <Button size="xs" variant="light">
                Ver
              </Button>
            </div>
          ))}
          {data.budgets.length === 0 ? <Text c="dimmed">Sin presupuestos.</Text> : null}
        </div>
      </section>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Recetas</h3>
        <div className={styles.rowList}>
          {data.prescriptions.map((prescription) => (
            <div className={styles.row} key={prescription.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  Receta {prescription.prescriptionDate ?? ""}
                </span>
                <span className={styles.rowMeta}>{prescription.status}</span>
              </div>
              <Button
                size="xs"
                variant="light"
                onClick={() => void openPortalPrescriptionPdf(prescription.id)}
              >
                Ver PDF
              </Button>
            </div>
          ))}
          {data.prescriptions.length === 0 ? <Text c="dimmed">Sin recetas emitidas.</Text> : null}
        </div>
      </section>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Tu contraseña</h3>
        <ChangePasswordForm
          hint={`${data.patient.recordNumber ? `Tu usuario es tu número de ficha (${data.patient.recordNumber}). ` : ""}En tu primer acceso la contraseña es tu DNI/NIE, sin espacios ni guiones y con la letra en mayúscula. Te recomendamos cambiarla por una propia.`}
        />
      </section>
    </Stack>
  );
}
