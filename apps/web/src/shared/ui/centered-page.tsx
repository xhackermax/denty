import type { ReactNode } from "react";

import styles from "./shared-ui.module.css";

export function CenteredPage({ children }: { children: ReactNode }) {
  return <main className={styles.centeredPage}>{children}</main>;
}
