"use client";

import { Button, Group, Modal } from "@mantine/core";
import type { FormEvent, ReactNode } from "react";

export interface FormDialogProps {
  opened: boolean;
  title: string;
  submitLabel: string;
  cancelLabel: string;
  children: ReactNode;
  loading?: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export function FormDialog(props: FormDialogProps) {
  const { opened, title, submitLabel, cancelLabel, children, loading, onSubmit, onClose } = props;

  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <form onSubmit={onSubmit}>
        {children}
        <Group justify="flex-end" mt="lg">
          <Button type="button" variant="default" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="submit" loading={loading ?? false}>
            {submitLabel}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}

export function PromptDialog(props: FormDialogProps) {
  return <FormDialog {...props} />;
}
