"use client";

import { ActionIcon } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import styles from "./shared-ui.module.css";

interface FloatingPanelProps {
  opened: boolean;
  title: string;
  closeLabel: string;
  children: ReactNode;
  onClose: () => void;
}

export function FloatingPanel(props: FloatingPanelProps) {
  const { opened, title, closeLabel, children, onClose } = props;
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {opened ? (
        <motion.aside
          className={styles.panel}
          initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
          aria-label={title}
        >
          <header className={styles.panelHeader}>
            <strong>{title}</strong>
            <ActionIcon variant="subtle" aria-label={closeLabel} onClick={onClose}>
              <IconX size={18} />
            </ActionIcon>
          </header>
          <div className={styles.panelBody}>{children}</div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
