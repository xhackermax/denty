import { Text, Title } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";
import type { ReactNode } from "react";

import styles from "./shared-ui.module.css";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className={`${styles.surface} ${styles.state}`} aria-label={title}>
      <div>
        <div className={styles.stateIcon} aria-hidden="true">
          <IconInbox size={26} />
        </div>
        <Title order={2} size="h4">
          {title}
        </Title>
        {description ? (
          <Text c="dimmed" mt={6} mb={action ? "md" : 0}>
            {description}
          </Text>
        ) : null}
        {action}
      </div>
    </section>
  );
}
