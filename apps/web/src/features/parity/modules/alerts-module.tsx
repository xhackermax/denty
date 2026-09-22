"use client";

import { Badge, Button, Select, Text } from "@mantine/core";
import { useState } from "react";

import styles from "@/shared/ui/parity.module.css";

type AlertPriority = "HIGH" | "MEDIUM" | "LOW";
type AlertStatus = "OPEN" | "IN_REVIEW" | "SNOOZED" | "RESOLVED";

interface AlertRow {
  id: string;
  priority: AlertPriority;
  status: AlertStatus;
  message: string;
  area: string;
  assignee?: string | undefined;
}

const INITIAL_ALERTS: readonly AlertRow[] = [
  {
    id: "ALT-101",
    priority: "HIGH",
    status: "OPEN",
    message: "Laboratorio retrasado LAB-1042",
    area: "Laboratorio",
  },
  {
    id: "ALT-102",
    priority: "MEDIUM",
    status: "IN_REVIEW",
    message: "Presupuesto de Juan Pérez pendiente",
    area: "Pacientes",
    assignee: "Máximo Tiburcio",
  },
  {
    id: "ALT-103",
    priority: "LOW",
    status: "SNOOZED",
    message: "Revisar copia cifrada semanal",
    area: "Seguridad",
    assignee: "Administración",
  },
];

function priorityColor(priority: AlertPriority): string {
  if (priority === "HIGH") return "red";
  if (priority === "MEDIUM") return "yellow";
  return "blue";
}

function statusColor(status: AlertStatus): string {
  if (status === "RESOLVED") return "green";
  if (status === "SNOOZED") return "gray";
  if (status === "IN_REVIEW") return "blue";
  return "orange";
}

export function AlertsModule() {
  const [alerts, setAlerts] = useState<AlertRow[]>(() => [...INITIAL_ALERTS]);

  const patch = (id: string, update: Partial<AlertRow>) => {
    setAlerts((current) =>
      current.map((alert) => (alert.id === id ? { ...alert, ...update } : alert)),
    );
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderText}>
          <h2 className={styles.sectionTitle}>Centro de alertas</h2>
          <p className={styles.sectionDescription}>
            Asignación, revisión, aplazado y resolución con estado explícito.
          </p>
        </div>
        <Text size="sm" c="dimmed">
          {alerts.filter((alert) => alert.status !== "RESOLVED").length} pendientes
        </Text>
      </div>

      <div className={styles.rowList}>
        {alerts.map((alert) => (
          <div className={styles.row} key={alert.id}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>{alert.message}</span>
              <span className={styles.rowMeta}>
                {alert.id} · {alert.area}
                {alert.assignee ? ` · ${alert.assignee}` : " · Sin asignar"}
              </span>
            </div>
            <div className={styles.rowActions}>
              <Badge color={priorityColor(alert.priority)} variant="light">
                {alert.priority}
              </Badge>
              <Badge color={statusColor(alert.status)} variant="outline">
                {alert.status}
              </Badge>
              <Select
                size="xs"
                placeholder="Asignar"
                value={alert.assignee ?? null}
                onChange={(value) => patch(alert.id, { assignee: value ?? undefined })}
                data={["Máximo Tiburcio", "Isaac Tiburcio", "Recepción", "Administración"]}
              />
              {alert.status === "OPEN" ? (
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => patch(alert.id, { status: "IN_REVIEW" })}
                >
                  Revisar
                </Button>
              ) : null}
              {alert.status !== "RESOLVED" ? (
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => patch(alert.id, { status: "SNOOZED" })}
                >
                  Posponer
                </Button>
              ) : null}
              {alert.status !== "RESOLVED" ? (
                <Button
                  size="xs"
                  color="green"
                  variant="light"
                  onClick={() => patch(alert.id, { status: "RESOLVED" })}
                >
                  Resolver
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
