"use client";

import {
  IconCalendarPlus,
  IconCash,
  IconFlask,
  IconPrescription,
  IconUserPlus,
} from "@tabler/icons-react";
import Link from "next/link";

import { TasksTimeline } from "./tasks/tasks-timeline";
import styles from "./tasks-page.module.css";

const QUICK_ACTIONS = [
  { title: "Crear paciente", href: "/app/patients", icon: IconUserPlus },
  { title: "Crear cita", href: "/app/agenda", icon: IconCalendarPlus },
  { title: "Emitir receta", href: "/app/prescriptions", icon: IconPrescription },
  { title: "Registrar cobro", href: "/app/finance", icon: IconCash },
  { title: "Laboratorio", href: "/app/laboratory", icon: IconFlask },
] as const;

export function TasksPage() {
  return (
    <div className={styles.workspace}>
      <nav className={styles.quickActions} aria-label="Acciones rápidas">
        <h2 className={styles.quickTitle}>Acciones rápidas</h2>
        <div className={styles.quickList}>
          {QUICK_ACTIONS.map(({ title, href, icon: Icon }) => (
            <Link className={styles.quickLink} href={href} key={href}>
              <span className={styles.quickIcon}>
                <Icon size={19} stroke={1.6} aria-hidden="true" />
              </span>
              <span>{title}</span>
            </Link>
          ))}
        </div>
      </nav>
      <section className={styles.tasksPanel} aria-label="Tareas">
        <TasksTimeline />
      </section>
    </div>
  );
}
