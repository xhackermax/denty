import type { ReactNode } from "react";

import styles from "./shared-ui.module.css";

export function Toolbar({ children, label }: { children: ReactNode; label?: string }) {
  return <div className={styles.toolbar} role="toolbar" aria-label={label}>{children}</div>;
}
