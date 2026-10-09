"use client";

import {
  Alert, Badge, Button, Checkbox, Group, Loader, Modal, NumberInput,
  Paper, Select, SimpleGrid, Stack, Text, Textarea, TextInput,
} from "@mantine/core";
import { IconPlus, IconRefresh } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { dentyQueryKeys } from "@/shared/query";
import { dateYMDMadrid } from "@/domain/dates";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import { PageHeader } from "@/shared/ui";
import { qualityApi, type IncidentCreateInput } from "./quality-api";

const categories = [
  { value: "CLINICAL_COMPLICATION", label: "Complicación clínica" },
  { value: "REPEATED_TREATMENT", label: "Tratamiento repetido / fracaso" },
  { value: "TECHNICAL", label: "Incidencia técnica" },
  { value: "LABORATORY", label: "Laboratorio" },
  { value: "PATIENT_COMPLAINT", label: "Reclamación del paciente" },
  { value: "OTHER", label: "Otra" },
];
const causes = [
  { value: "UNDETERMINED", label: "Por determinar" },
  { value: "CLINICAL", label: "Clínica" },
  { value: "MATERIAL", label: "Material" },
  { value: "LABORATORY", label: "Laboratorio" },
  { value: "PATIENT_RELATED", label: "Relacionada con el paciente" },
  { value: "OTHER", label: "Otra" },
];
const statuses = [
  { value: "OPEN", label: "Abierta" },
  { value: "INVESTIGATING", label: "En investigación" },
  { value: "RESOLVED", label: "Resuelta" },
  { value: "CLOSED", label: "Cerrada" },
];
const severities = [
  { value: "LOW", label: "Baja" },
  { value: "MODERATE", label: "Moderada" },
  { value: "HIGH", label: "Alta" },
  { value: "CRITICAL", label: "Crítica" },
];
const labelOf = (choices: {value:string;label:string}[], value: string) =>
  choices.find(choice => choice.value === value)?.label ?? value;
const empty = (patientId = "", doctorId = ""): IncidentCreateInput => ({
  patientId, doctorId: doctorId || null, appointmentId: null,
  title: "", description: "", category: "CLINICAL_COMPLICATION",
  cause: "UNDETERMINED", severity: "MODERATE",
  repeatTreatment: false, costCents: 0,
});

function IncidentItem({ item, doctors, editable, onSave, busy }: {
  item: Awaited<ReturnType<typeof qualityApi.incidents>>["items"][number];
  doctors: { id: string; display_name: string }[];
  editable: boolean; onSave: (id:string, status:string, action:string)=>void; busy:boolean;
}) {
  const [status, setStatus] = useState(item.status);
  const [action, setAction] = useState(item.corrective_action ?? "");
  const doctor = doctors.find(d => d.id === item.responsible_doctor_id);
  return <Paper key={item.id} withBorder p="md" radius="md">
    <Stack gap="sm">
      <Group justify="space-between" align="start">
        <div>
          <Text fw={750}>{item.title}</Text>
          <Text size="sm" c="dimmed">{item.patientName}
            {item.recordNumber ? ` · Ficha ${item.recordNumber}` : ""}</Text>
        </div>
        <Group gap="xs">
          <Badge color={item.severity === "CRITICAL" ? "red" : "gray"}>
            {labelOf(severities, item.severity)}
          </Badge>
          <Badge color={item.status === "CLOSED" ? "green" : "orange"}>
            {labelOf(statuses, item.status)}
          </Badge>
        </Group>
      </Group>
      <Text size="sm">{item.description}</Text>
      <SimpleGrid cols={{base:1,sm:3}}>
        <Text size="xs" c="dimmed">Tipo: {labelOf(categories, item.category)}</Text>
        <Text size="xs" c="dimmed">Causa: {labelOf(causes, item.cause)}</Text>
        <Text size="xs" c="dimmed">Doctor: {doctor?.display_name ?? "Sin asignar"}</Text>
      </SimpleGrid>
      {item.repeat_treatment && <Badge variant="light" color="red">Repetición de tratamiento</Badge>}
      <Group gap="xs">
        <Button component={Link} size="xs" variant="subtle"
          href={`/app/patients/${item.patient_id}`}>Abrir ficha del paciente</Button>
        {item.appointment_id && <Button component={Link} size="xs" variant="subtle"
          href={item.appointmentStart
            ? `/app/agenda?date=${dateYMDMadrid(item.appointmentStart)}&appointmentId=${item.appointment_id}`
            : "/app/agenda"}>Abrir cita original</Button>}
        <Text size="xs" c="dimmed">Registrada: {new Intl.DateTimeFormat("es-ES",
          { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Madrid" })
          .format(new Date(item.occurred_at))}</Text>
      </Group>
      {editable && <Group gap="sm" align="end" wrap="wrap">
        <Select label="Estado" value={status} onChange={v=>setStatus(v ?? status)} data={statuses}/>
        <Textarea label="Acción correctiva / seguimiento" autosize minRows={1}
          value={action} onChange={e=>setAction(e.currentTarget.value)}/>
        <Button size="sm" loading={busy} onClick={()=>onSave(item.id,status,action)}>
          Guardar seguimiento</Button>
      </Group>}
    </Stack>
  </Paper>;
}

export function IncidentsPage({ initialPatientId, initialDoctorId }: {
  initialPatientId?: string; initialDoctorId?: string;
}) {
  const { activeClinicId, permissions } = useActiveTenant();
  const queryClient = useQueryClient();
  const [patientId, setPatientId] = useState(initialPatientId ?? "");
  const [doctorId, setDoctorId] = useState(initialDoctorId ?? "");
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<IncidentCreateInput>(() => empty(initialPatientId, initialDoctorId));
  const [patientSearch, setPatientSearch] = useState("");
  const [filterPatientSearch, setFilterPatientSearch] = useState("");
  const [formError, setFormError] = useState("");
  const [savingId, setSavingId] = useState("");
  const canRead = permissions.includes("clinical.read");
  const canWrite = permissions.includes("clinical.write");
  const filters = { ...(patientId ? {patientId} : {}),
    ...(doctorId ? {doctorId} : {}), ...(status ? {status} : {}) };
  const incidents = useQuery({
    queryKey: ["denty", "quality", "incidents", filters],
    queryFn: () => qualityApi.incidents(filters),
    enabled: Boolean(activeClinicId) && canRead,
  });
  const doctors = useQuery({
    queryKey: [...dentyQueryKeys.staff.root, "quality-staff"],
    queryFn: qualityApi.staff, enabled: Boolean(activeClinicId) && canRead,
  });
  const filterPatients = useQuery({
    queryKey: [...dentyQueryKeys.patients.root, "quality-filter", filterPatientSearch],
    queryFn: () => qualityApi.patients(filterPatientSearch),
    enabled: Boolean(activeClinicId) && canRead && filterPatientSearch.trim().length >= 2,
  });
  const linkedAppointments = useQuery({
    queryKey: ["denty", "quality", "patient-appointments", form.patientId],
    queryFn: () => qualityApi.patientAppointments(form.patientId),
    enabled: Boolean(activeClinicId) && canRead && modalOpen && Boolean(form.patientId),
  });
  const patients = useQuery({
    queryKey: [...dentyQueryKeys.patients.root, "quality-search", patientSearch],
    queryFn: () => qualityApi.patients(patientSearch),
    enabled: Boolean(activeClinicId) && canRead && patientSearch.trim().length >= 2,
  });
  const invalidate = () => {
    void queryClient.invalidateQueries({queryKey:["denty","quality","incidents"]});
    void queryClient.invalidateQueries({queryKey:dentyQueryKeys.analytics.root});
  };
  const create = useMutation({
    mutationFn: qualityApi.createIncident,
    onSuccess: () => {
      invalidate(); setModalOpen(false);
      setPatientSearch(""); setForm(empty(patientId, doctorId)); setFormError("");
    },
    onError: error => setFormError(error instanceof Error ? error.message : "No se pudo guardar."),
  });
  const update = useMutation({
    mutationFn: (payload: {id:string;status:string;action:string}) =>
      qualityApi.updateIncident(payload.id,payload.status,payload.action),
    onSettled: () => { setSavingId(""); invalidate(); },
  });
  const staff = (doctors.data?.items ?? [])
    .filter(d=>/DENTIST|DOCTOR|ODONTO|CLINICIAN/i.test(d.role));
  const staffOptions = staff.map(d=>({value:d.id,label:d.display_name}));
  const setField = <K extends keyof IncidentCreateInput>(
    key: K, value: IncidentCreateInput[K]) => setForm(old=>({...old,[key]:value}));
  return <Stack gap="lg">
    <PageHeader title="Incidencias clínicas"
      description="Registro y seguimiento de complicaciones, repeticiones y reclamaciones vinculadas a cada paciente." />
    <Group gap="sm" wrap="wrap">
      <Button component={Link} href="/app/analysis/doctors" variant="light">
        Ver análisis por doctores</Button>
      <Button leftSection={<IconRefresh size={16}/>} variant="light"
        onClick={()=>void incidents.refetch()}>Actualizar</Button>
      {canWrite && <Button leftSection={<IconPlus size={16}/>} onClick={()=>{
        setForm(empty(patientId,doctorId)); setFormError(""); setModalOpen(true);
      }}>Nueva incidencia</Button>}
    </Group>
    {!canRead && <Alert color="orange">No tienes permiso para consultar incidencias clínicas.</Alert>}
    <Group gap="sm" align="end" wrap="wrap">
      <Stack gap={4}>
        <TextInput label="Buscar paciente" value={filterPatientSearch}
          placeholder="Nombre o número de ficha"
          onChange={e=>setFilterPatientSearch(e.currentTarget.value)}/>
        <Select aria-label="Filtrar por paciente" clearable searchable
          placeholder={patientId ? "Paciente seleccionado" : "Todos los pacientes"}
          value={patientId || null} onChange={value=>setPatientId(value ?? "")}
          data={(filterPatients.data?.items ?? []).map(p=>({
            value:p.id,label:`${p.first_name} ${p.last_name} · ${p.record_number ?? "Sin ficha"}`,
          })).concat(patientId && !(filterPatients.data?.items ?? []).some(p=>p.id===patientId)
            ? [{value:patientId,label:"Paciente seleccionado"}] : [])}/>
      </Stack>
      <Select label="Doctor" clearable placeholder="Todos"
        data={staffOptions} value={doctorId || null}
        onChange={value=>setDoctorId(value ?? "")}/>
      <Select label="Estado" clearable placeholder="Todos"
        data={statuses} value={status || null} onChange={value=>setStatus(value ?? "")}/>
    </Group>
    {incidents.isLoading && <Loader aria-label="Cargando incidencias"/>}
    {incidents.isError && <Alert color="red">No se pudieron cargar las incidencias desde Supabase.</Alert>}
    {update.isError && <Alert color="red">No se pudo guardar el seguimiento. Revisa permisos y conexión.</Alert>}
    {incidents.data && <>
      <Text size="sm" c="dimmed">{incidents.data.items.length} incidencias encontradas
        {incidents.data.truncated ? " (solo las 300 más recientes)" : ""}</Text>
      {!incidents.data.items.length && <Alert color="gray">No se han registrado incidencias para estos filtros.</Alert>}
      {incidents.data.items.map(item=><IncidentItem key={item.id} item={item}
        doctors={doctors.data?.items ?? []} editable={canWrite}
        busy={update.isPending && savingId === item.id}
        onSave={(id, nextStatus, action)=>{
          setSavingId(id); update.mutate({id,status:nextStatus,action});
        }}/>)}
    </>}
    <Modal opened={modalOpen} onClose={()=>setModalOpen(false)} title="Registrar incidencia clínica" size="lg">
      <Stack gap="sm">
        <TextInput label="Buscar paciente" placeholder="Nombre, apellidos o número de ficha"
          value={patientSearch} onChange={e=>setPatientSearch(e.currentTarget.value)}/>
        <Select label="Paciente" required searchable placeholder="Selecciona una ficha"
          data={(patients.data?.items ?? []).map(p=>({
            value:p.id,label:`${p.first_name} ${p.last_name} · ${p.record_number ?? "Sin número"}`,
          })).concat(form.patientId && !(patients.data?.items ?? []).some(p=>p.id===form.patientId)
            ? [{value:form.patientId,label:"Paciente de la ficha seleccionada"}] : [])}
          value={form.patientId || null} onChange={value=>{
            setForm(old=>({...old,patientId:value??"",appointmentId:null}));
          }}/>
        <Select label="Cita original (opcional)" clearable searchable
          placeholder="Selecciona una cita de este paciente"
          data={(linkedAppointments.data?.items ?? []).map(a=>({
            value:a.id,
            label:`${new Intl.DateTimeFormat("es-ES", {
              dateStyle:"short", timeStyle:"short", timeZone:"Europe/Madrid",
            }).format(new Date(a.startsAt))} · ${a.title} (${a.status})`,
          }))}
          value={form.appointmentId ?? null}
          onChange={v=>setField("appointmentId",v ?? null)}/>
        <Select label="Doctor responsable" clearable data={staffOptions}
          value={form.doctorId ?? null}
          onChange={value=>setField("doctorId",value ?? null)}/>
        <TextInput label="Título" required value={form.title}
          onChange={e=>setField("title",e.currentTarget.value)}/>
        <Textarea label="Descripción clínica" required autosize minRows={3}
          value={form.description} onChange={e=>setField("description",e.currentTarget.value)}/>
        <SimpleGrid cols={{base:1,sm:2}}>
          <Select label="Tipo de incidencia" required data={categories}
            value={form.category} onChange={v=>setField("category",v ?? "OTHER")}/>
          <Select label="Causa" required data={causes}
            value={form.cause} onChange={v=>setField("cause",v ?? "UNDETERMINED")}/>
          <Select label="Gravedad" required data={severities}
            value={form.severity} onChange={v=>setField("severity",v ?? "MODERATE")}/>
          <NumberInput label="Coste asociado (€)" min={0} decimalScale={2}
            value={form.costCents / 100} onChange={v=>setField("costCents",
              typeof v === "number" ? Math.round(v * 100) : 0)}/>
        </SimpleGrid>
        <Checkbox label="Ha requerido repetir un tratamiento" checked={form.repeatTreatment}
          onChange={e=>setField("repeatTreatment",e.currentTarget.checked)}/>
        {formError && <Alert color="red">{formError}</Alert>}
        <Group justify="flex-end">
          <Button variant="default" onClick={()=>setModalOpen(false)}>Cancelar</Button>
          <Button loading={create.isPending} disabled={!form.patientId || !form.title.trim()
            || !form.description.trim()} onClick={()=>create.mutate(form)}>Guardar incidencia</Button>
        </Group>
      </Stack>
    </Modal>
  </Stack>;
}
