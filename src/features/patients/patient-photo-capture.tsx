"use client";

import { Alert, Button, FileButton, Group, Stack, Text } from "@mantine/core";
import { IconCamera, IconPhoto, IconRefresh, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import styles from "./patient-photo-capture.module.css";
import { compressPhotoFile, compressVideoFrame } from "./photo-compression";

interface PatientPhotoCaptureProps {
  value: File | null;
  onPhotoReady: (file: File | null) => void;
  disabled?: boolean;
}

function cameraErrorMessage(caught: unknown): string {
  const name = caught instanceof DOMException ? caught.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "El navegador ha bloqueado la cámara. Permite el acceso desde el candado de la barra de direcciones y vuelve a intentarlo, o elige una foto.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No se ha encontrado ninguna cámara en este dispositivo. Puedes elegir una foto.";
  if (name === "NotReadableError")
    return "La cámara está en uso por otra aplicación. Ciérrala y vuelve a intentarlo.";
  return "No se pudo acceder a la cámara. Puedes seleccionar una foto manualmente.";
}

export function PatientPhotoCapture({
  value,
  onPhotoReady,
  disabled = false,
}: PatientPhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  useEffect(() => () => stopCamera(), []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const startCamera = async () => {
    setError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("La cámara requiere HTTPS y un navegador compatible.");
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      // The <video> element only mounts once cameraActive is true; the effect below
      // attaches the stream to it after that render.
      setCameraActive(true);
    } catch (caught) {
      setError(cameraErrorMessage(caught));
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraActive || !video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => {
      setError("La cámara está abierta pero el navegador no pudo mostrar la imagen.");
    });
  }, [cameraActive]);

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("Espera a que aparezca la imagen de la cámara y vuelve a pulsar.");
      return;
    }
    try {
      onPhotoReady(await compressVideoFrame(video));
      stopCamera();
    } catch {
      setError("No se pudo procesar la foto.");
    }
  };

  const choosePhoto = async (file: File | null) => {
    setError(null);
    if (!file) return;
    try {
      onPhotoReady(await compressPhotoFile(file));
    } catch {
      setError("No se pudo leer esa imagen. Prueba con una foto JPG, PNG o WebP.");
    }
  };

  return (
    <Stack gap="xs">
      <Text fw={600}>Foto del paciente</Text>
      <Text size="sm" c="dimmed">
        Opcional. El permiso de cámara se solicita solo al pulsar “Abrir cámara”.
      </Text>
      {error ? <Alert color="yellow">{error}</Alert> : null}
      {cameraActive ? (
        <Stack gap="xs">
          <video ref={videoRef} playsInline muted className={styles.video} />
          <Group>
            <Button
              leftSection={<IconCamera size={16} />}
              onClick={() => void capturePhoto()}
              disabled={disabled}
            >
              Tomar foto
            </Button>
            <Button variant="light" color="gray" onClick={stopCamera}>
              Cancelar
            </Button>
          </Group>
        </Stack>
      ) : previewUrl ? (
        <Stack gap="xs">
          <img src={previewUrl} alt="Vista previa del paciente" className={styles.preview} />
          <Group>
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={() => void startCamera()}
              disabled={disabled}
            >
              Repetir
            </Button>
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconX size={16} />}
              onClick={() => onPhotoReady(null)}
              disabled={disabled}
            >
              Quitar
            </Button>
          </Group>
        </Stack>
      ) : (
        <Group>
          <Button
            leftSection={<IconCamera size={16} />}
            onClick={() => void startCamera()}
            disabled={disabled}
          >
            Abrir cámara
          </Button>
          <FileButton onChange={(file) => void choosePhoto(file)} accept="image/*">
            {(props) => (
              <Button
                {...props}
                variant="light"
                leftSection={<IconPhoto size={16} />}
                disabled={disabled}
              >
                Elegir foto
              </Button>
            )}
          </FileButton>
        </Group>
      )}
    </Stack>
  );
}
