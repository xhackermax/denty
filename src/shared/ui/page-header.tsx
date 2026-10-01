import { PageBackButton } from "./page-back-button";
import { Group, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

import styles from "./shared-ui.module.css";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <PageBackButton />
      <div className={styles.pageHeaderText}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <Title order={1} size="h2">
          {title}
        </Title>
        {description ? (
          <Text c="dimmed" maw={760} mt={4}>
            {description}
          </Text>
        ) : null}
      </div>
      {actions ? <Group>{actions}</Group> : null}
    </header>
  );
}
