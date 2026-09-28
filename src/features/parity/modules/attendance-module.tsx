"use client";

import { Alert, Badge, Button, Group, Stack, Text } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { todayMadrid } from "@/domain/dates";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

export function AttendanceModule() {
  const day=todayMadrid();
  const queryClient=useQueryClient();
  const me=useQuery({queryKey:dentyQueryKeys.staff.attendance(day),queryFn:()=>getBrowserApi().attendance.me(day)});
  const daily=useQuery({queryKey:dentyQueryKeys.staff.all,queryFn:()=>getBrowserApi().attendance.daily(day)});
  const punch=useMutation({mutationFn:()=>getBrowserApi().attendance.punch(),onSuccess:()=>{void queryClient.invalidateQueries({queryKey:dentyQueryKeys.staff.root});}});
  if(me.isError||daily.isError) return <Alert color="red">No se pudo cargar el fichaje real.</Alert>;
  return <Stack><Group justify="space-between"><div><Text fw={700}>Mi jornada</Text><Text c="dimmed" size="sm">{day}</Text></div><Button onClick={()=>punch.mutate()} loading={punch.isPending}>{me.data?.nextAction==="OUT"?"Fichar salida":"Fichar entrada"}</Button></Group><div className={styles.rowList}>{(me.data?.punches??[]).map((entry)=><div className={styles.row} key={entry.id}><span className={styles.rowTitle}>{entry.id}</span><Badge variant="light">Registrado</Badge></div>)}</div><Text size="sm" c="dimmed">Personal con actividad hoy: {daily.data?.rows.length??0}</Text></Stack>;
}
