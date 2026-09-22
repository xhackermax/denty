"use client";

import { Button, Text, Title } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import styles from "./shared-ui.module.css";

interface ErrorStateProps {
  title: string;
  description?: string;
  retryLabel: string;
  onRetry?: () => void;
}

export function ErrorState({ title, description, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <section className={`${styles.surface} ${styles.state}`} role="alert" aria-label={title}>
      <div>
        <div className={styles.stateIcon} aria-hidden="true">
          <IconAlertTriangle size={26} />
        </div>
        <Title order={2} size="h4">
          {title}
        </Title>
        {description ? (
          <Text c="dimmed" mt={6}>
            {description}
          </Text>
        ) : null}
        {onRetry ? (
          <Button mt="md" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
