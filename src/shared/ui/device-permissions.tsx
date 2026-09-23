"use client";
import { ActionIcon, Alert, Badge, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { IconCamera, IconMicrophone, IconSettings } from "@tabler/icons-react";
import { useEffect, useState } from "react";
type PermissionStateLike = "granted" | "denied" | "prompt" | "unsupported";
type MediaKind = "microphone" | "camera";
async function queryPermission(kind: MediaKind): Promise<PermissionStateLike> {
  if (!("permissions" in navigator)) return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: kind as PermissionName });
    return status.state;
  } catch {
    return "unsupported";
  }
}
function badgeColor(state: PermissionStateLike): string {
  if (state === "granted") return "green";
  if (state === "denied") return "red";
  if (state === "prompt") return "yellow";
  return "gray";
}
function stateLabel(state: PermissionStateLike): string {
  if (state === "granted") return "Permitido";
  if (state === "denied") return "Bloqueado";
  if (state === "prompt") return "Sin decidir";
  return "No consultable";
}
export async function requestMediaPermission(kind: MediaKind): Promise<void> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Cámara y micro requieren HTTPS.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: kind === "microphone",
    video: kind === "camera",
  });
  stream.getTracks().forEach((track) => track.stop());
}
export function DevicePermissions() {
  const [opened, setOpened] = useState(false);
  const [microphone, setMicrophone] = useState<PermissionStateLike>("prompt");
  const [camera, setCamera] = useState<PermissionStateLike>("prompt");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<MediaKind | null>(null);
  const [secureContext, setSecureContext] = useState(true);
  const refresh = async () => {
    const [mic, cam] = await Promise.all([
      queryPermission("microphone"),
      queryPermission("camera"),
    ]);
    setMicrophone(mic);
    setCamera(cam);
  };
  useEffect(() => {
    setSecureContext(window.isSecureContext);
    if (opened) void refresh();
  }, [opened]);
  const request = async (kind: MediaKind) => {
    setBusy(kind);
    setError(null);
    try {
      await requestMediaPermission(kind);
      await refresh();
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      setError(
        name === "NotAllowedError"
          ? "El navegador ha bloqueado el permiso. " + "Permítelos desde el candado del navegador."
          : cause instanceof Error
            ? cause.message
            : "No se pudo solicitar el permiso.",
      );
      await refresh();
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <ActionIcon
        variant="light"
        size="lg"
        aria-label="Cámara y micrófono"
        onClick={() => setOpened(true)}
      >
        <IconSettings size={18} />
      </ActionIcon>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Cámara y micrófono">
        <Stack>
          {!secureContext ? (
            <Alert color="red" title="Contexto no seguro">
              Abre Denty por HTTPS o localhost para que el navegador permita solicitar dispositivos.
            </Alert>
          ) : null}
          {error ? <Alert color="red">{error}</Alert> : null}
          <Group justify="space-between">
            <Group gap="xs">
              <IconMicrophone size={20} />
              <Text fw={700}>Micrófono</Text>
            </Group>
            <Badge color={badgeColor(microphone)}>{stateLabel(microphone)}</Badge>
          </Group>
          <Button loading={busy === "microphone"} onClick={() => void request("microphone")}>
            Solicitar micrófono
          </Button>
          <Group justify="space-between" mt="sm">
            <Group gap="xs">
              <IconCamera size={20} />
              <Text fw={700}>Cámara</Text>
            </Group>
            <Badge color={badgeColor(camera)}>{stateLabel(camera)}</Badge>
          </Group>
          <Button loading={busy === "camera"} onClick={() => void request("camera")}>
            Solicitar cámara
          </Button>
          <Text size="xs" c="dimmed">
            El navegador muestra su propio diálogo de permiso. Denty abre el dispositivo solo para
            validar acceso y detiene el stream inmediatamente.
          </Text>
        </Stack>
      </Modal>
    </>
  );
}
