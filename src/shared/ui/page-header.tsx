import { PageBackButton } from "./page-back-button";
import { Group, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

import styles from "./shared-ui.module.css";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <PageBackButton />
      <div className={styles.pageHeaderText}>
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
