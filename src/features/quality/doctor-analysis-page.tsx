"use client";

import { Alert, Badge, Button, Group, Loader, Select, SimpleGrid, Table, Text, TextInput, Stack, ScrollArea } from "@mantine/core";
import { IconArrowLeft, IconClipboardList } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { addDaysMadrid, dateYMDMadrid, madridLocalDateTime, todayMadrid, toMadridISO } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import { dentyQueryKeys } from "@/shared/query";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import { PageHeader } from "@/shared/ui";
import { qualityApi } from "./quality-api";

const CATEGORY_LABELS: Record<string, string> = {
  RESTORATION: "Obturaciones",
  ENDODONTICS: "Endodoncias",
  ORTHODONTICS: "Ortodoncia",
  IMPLANTOLOGY: "Implantes",
  IMPLANT: "Implantes",
  SURGERY: "Cirugía",
  PERIODONTICS: "Periodoncia",
  PREVENTION: "Prevención / limpiezas",
  PROSTHESIS: "Prótesis",
  PROSTHODONTICS: "Prótesis",
};
const nameOf = (category: string) => CATEGORY_LABELS[category] ?? category.replaceAll("_", " ");

export function DoctorAnalysisPage() {
  const today = todayMadrid();
  const [startDate, setStartDate] = useState(() =>
    dateYMDMadrid(addDaysMadrid(madridLocalDateTime(today, "12:00"), -30)));
  const [endDate, setEndDate] = useState(today);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const { activeClinicId, activeSiteId, permissions } = useActiveTenant();
  const range = useMemo(() => {
    const from = toMadridISO(madridLocalDateTime(startDate, "00:00"));
    const dayAfter = dateYMDMadrid(addDaysMadrid(madridLocalDateTime(endDate, "12:00"), 1));
    return { start: from, end: toMadridISO(madridLocalDateTime(dayAfter, "00:00")),
      ...(activeSiteId ? { siteId: activeSiteId } : {}) };
  }, [startDate, endDate, activeSiteId]);
  const query = useQuery({
    queryKey: [...dentyQueryKeys.analytics.root, "doctor-quality", range],
    queryFn: () => qualityApi.doctors(range),
    enabled: Boolean(activeClinicId) && permissions.includes("analysis.read") &&
      startDate <= endDate,
  });
  const all = query.data?.items ?? [];
  const shown = doctorId ? all.filter(d => d.doctorId === doctorId) : all;
  const visits = shown.reduce((sum, doctor) => sum + doctor.completedVisits, 0);
  const executed = shown.reduce((sum, doctor) => sum + doctor.recordedExecutions, 0);
  const incidents = shown.reduce((sum, doctor) => sum + doctor.reportedIncidents, 0);

  return <Stack gap="lg">
    <PageHeader title="Análisis por doctores"
      description="Actividad clínica verificada, incidencias, implantes y fichajes por profesional." />
    <Group gap="sm" wrap="wrap">
      <Button component={Link} href="/app/analysis" variant="light"
        leftSection={<IconArrowLeft size={16}/>}>Volver a Análisis</Button>
      <Button component={Link} href="/app/incidents" variant="light"
        leftSection={<IconClipboardList size={16}/>}>Gestionar incidencias</Button>
    </Group>
    <section aria-label="Filtros del rendimiento médico">
      <Group gap="sm" align="end" wrap="wrap">
        <TextInput type="date" label="Desde" value={startDate} max={endDate}
          onChange={e=>setStartDate(e.currentTarget.value)} />
        <TextInput type="date" label="Hasta" value={endDate} min={startDate}
          max={today} onChange={e=>setEndDate(e.currentTarget.value)} />
        <Select label="Doctor" placeholder="Todos los doctores" clearable
          value={doctorId} onChange={setDoctorId}
          data={all.map(d=>({value:d.doctorId,label:d.doctorName}))} />
      </Group>
    </section>
    {!permissions.includes("analysis.read") &&
      <Alert color="orange">Necesitas permiso de análisis para consultar los indicadores de los doctores.</Alert>}
    {query.isLoading && <Loader aria-label="Cargando estadísticas de doctores"/>}
    {query.isError && <Alert color="red">No se pudieron cargar los indicadores desde Supabase.
      Comprueba los permisos y la conexión de la clínica.</Alert>}
    {query.data && <>
      <Alert color="blue" title="Criterio de contabilización">
        {query.data.warning} Las horas se calculan solo con pares de fichajes válidos.
        El ticket medio corresponde a facturas emitidas vinculadas al tratamiento. No equivale al dinero cobrado.
      </Alert>
      <SimpleGrid cols={{base:2,md:4}}>
        <section><Text size="xs" c="dimmed">Citas terminadas</Text><Text size="xl" fw={800}>{visits}</Text></section>
        <section><Text size="xs" c="dimmed">Tratamientos ejecutados</Text><Text size="xl" fw={800}>{executed}</Text></section>
        <section><Text size="xs" c="dimmed">Incidencias registradas</Text><Text size="xl" fw={800}>{incidents}</Text></section>
        <section><Text size="xs" c="dimmed">Doctores</Text><Text size="xl" fw={800}>{shown.length}</Text></section>
      </SimpleGrid>
      {!shown.length ? <Alert color="gray">No hay doctores disponibles para los filtros seleccionados.</Alert> :
        <ScrollArea>
          <Table striped highlightOnHover verticalSpacing="md" aria-label="Resultados por doctor">
            <Table.Thead><Table.Tr>
              <Table.Th>Doctor</Table.Th><Table.Th>Citas</Table.Th>
              <Table.Th>Pacientes</Table.Th><Table.Th>Tratamientos</Table.Th>
              <Table.Th>Ticket medio facturado</Table.Th><Table.Th>Horas fichadas</Table.Th>
              <Table.Th>Implantes</Table.Th><Table.Th>Incidencias</Table.Th>
            </Table.Tr></Table.Thead>
            <Table.Tbody>{shown.map(d=><Table.Tr key={d.doctorId}>
              <Table.Td><Text fw={700}>{d.doctorName}</Text><Text size="xs" c="dimmed">
                {d.recordedExecutions} ejecuciones confirmadas</Text></Table.Td>
              <Table.Td>{d.completedVisits}</Table.Td>
              <Table.Td>{d.uniquePatients}</Table.Td>
              <Table.Td>{Object.entries(d.treatmentCounts).length ?
                Object.entries(d.treatmentCounts).sort((a,b)=>b[1]-a[1])
                  .map(([cat,count])=><Text key={cat} size="sm">{nameOf(cat)}: {count}</Text>)
                : <Text size="xs" c="dimmed">Sin ejecuciones registradas</Text>}</Table.Td>
              <Table.Td>{d.averageTicketCents === null ?
                <Text c="dimmed" size="sm">No disponible</Text> : formatEUR(d.averageTicketCents)}
                <Text size="xs" c="dimmed">Cobertura:
                  {" "}{Math.round(d.attributedRevenueCoverage*100)}%</Text></Table.Td>
              <Table.Td>{d.attendanceHours === null ?
                <Text size="xs" c="dimmed">{d.attendanceNote ?? "No calculable"}</Text> :
                <Text>{d.attendanceHours.toLocaleString("es-ES")} h</Text>}</Table.Td>
              <Table.Td><Badge color="green">{d.placedImplants} colocados</Badge>
                {d.failedPlacementAttempts+d.subsequentImplantFailures > 0 &&
                <Text size="xs" c="red">{d.failedPlacementAttempts} intentos fallidos,
                  {" "}{d.subsequentImplantFailures} fracasos posteriores</Text>}
                {d.deferredImplants > 0 && <Text size="xs">{d.deferredImplants} diferidos</Text>}</Table.Td>
              <Table.Td><Button component={Link} variant="subtle" size="xs"
                href={`/app/incidents?doctorId=${d.doctorId}`}>
                {d.reportedIncidents} incidencias
              </Button><Text size="xs" c="dimmed">{d.repeatedTreatmentIncidents} repeticiones</Text></Table.Td>
            </Table.Tr>)}</Table.Tbody>
          </Table>
        </ScrollArea>}
    </>}
  </Stack>;
}
