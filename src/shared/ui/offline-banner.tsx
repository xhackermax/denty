"use client";

import { Alert } from "@mantine/core";
import { IconCloudOff } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import styles from "./shared-ui.module.css";

export function OfflineBanner({ message }: { message: string }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(window.navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <Alert
      className={styles.banner}
      color="red"
      icon={<IconCloudOff size={18} />}
      title={message}
    />
  );
}
