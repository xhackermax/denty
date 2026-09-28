"use client";

import { Button, Group, Text } from "@mantine/core";
import Link from "next/link";
import styles from "@/shared/ui/parity.module.css";

const QUICK_ACTIONS = [
  ["Crear paciente", "Alta y ficha clínica", "/app/patients"],
  ["Crear cita", "Abrir agenda", "/app/agenda"],
  ["Emitir receta", "Abrir recetas", "/app/prescriptions"],
  ["Registrar cobro", "Abrir finanzas", "/app/finance"],
] as const;

export function TasksPage() {
  return <div className={styles.rowList}>{QUICK_ACTIONS.map(([title, description, href])=><div className={styles.row} key={title}><div className={styles.rowMain}><span className={styles.rowTitle}>{title}</span><Text className={styles.rowMeta}>{description}</Text></div><Group><Button component={Link} href={href} size="xs" variant="light">Abrir</Button></Group></div>)}</div>;
}
