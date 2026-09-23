import { Alert } from "@mantine/core";
import { IconFlask } from "@tabler/icons-react";

import styles from "./shared-ui.module.css";

export function DemoBanner({ enabled, message }: { enabled: boolean; message: string }) {
  if (!enabled) return null;

  return (
    <Alert
      className={styles.banner}
      color="yellow"
      icon={<IconFlask size={18} />}
      title={message}
    />
  );
}
