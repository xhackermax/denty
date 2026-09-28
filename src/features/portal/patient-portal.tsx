"use client";

import { Alert, Badge, Button, Group, Stack, Text, Title } from "@mantine/core";
import { usePatientProjectionQuery } from "@/shared/patients/patient-data";
import { formatEUR } from "@/domain/money";
import styles from "@/shared/ui/parity.module.css";

export function PatientPortal({ patientId }: { patientId: string }) {
  const projection = usePatientProjectionQuery(patientId);
  if (projection.isLoading) return <Text c="dimmed">Cargando portal…</Text>;
  if (projection.isError || !projection.data) return <Alert color="red">No se pudo cargar el portal del paciente.</Alert>;
  const data = projection.data;
  return <Stack gap="md">
    <Group justify="space-between"><div><Title order={2}>{data.patient.firstName} {data.patient.lastName}</Title><Text c="dimmed">Portal conectado a la proyección real del paciente.</Text></div><Badge variant="light">Paciente</Badge></Group>
    <section className={styles.section}><h3 className={styles.sectionTitle}>Próximas citas</h3><div className={styles.rowList}>{data.appointments.map((appointment)=><div className={styles.row} key={appointment.id}><div className={styles.rowMain}><span className={styles.rowTitle}>{appointment.title}</span><span className={styles.rowMeta}>{new Date(appointment.startsAt).toLocaleString("es-ES")}</span></div><Badge>{appointment.status}</Badge></div>)}{data.appointments.length===0?<Text c="dimmed">Sin citas.</Text>:null}</div></section>
    <section className={styles.section}><h3 className={styles.sectionTitle}>Presupuestos</h3><div className={styles.rowList}>{data.budgets.map((budget)=><div className={styles.row} key={budget.id}><div className={styles.rowMain}><span className={styles.rowTitle}>{formatEUR(budget.totalCents)}</span><span className={styles.rowMeta}>{budget.status}</span></div><Button size="xs" variant="light">Ver</Button></div>)}{data.budgets.length===0?<Text c="dimmed">Sin presupuestos.</Text>:null}</div></section>
  </Stack>;
}
