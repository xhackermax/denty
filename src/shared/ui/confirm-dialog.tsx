"use client";

import { Button, Group, Modal, Text } from "@mantine/core";

interface ConfirmDialogProps {
  opened: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    opened,
    title,
    body,
    confirmLabel,
    cancelLabel,
    destructive,
    loading,
    onConfirm,
    onClose,
  } = props;

  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Text>{body}</Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          {...(destructive ? { color: "red" as const } : {})}
          loading={loading ?? false}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  );
}
