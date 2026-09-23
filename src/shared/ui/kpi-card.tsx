import { Text } from "@mantine/core";
import type { ReactNode } from "react";

import styles from "./shared-ui.module.css";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  detail?: string;
}

export function KpiCard({ label, value, detail }: KpiCardProps) {
  return (
    <article className={`${styles.surface} ${styles.kpi}`}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
      {detail ? (
        <Text c="dimmed" size="sm">
          {detail}
        </Text>
      ) : null}
    </article>
  );
}
