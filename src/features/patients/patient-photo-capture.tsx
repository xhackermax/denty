"use client";

import { Alert, Button, FileButton, Group, Stack, Text } from "@mantine/core";
import { IconCamera, IconPhoto, IconRefresh, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import styles from "./patient-photo-capture.module.css";

interface PatientPhotoCaptureProps {
  value: File | null;
  onPhotoReady: (file: File | null) => void;
  disabled?: boolean;
}

export function PatientPhotoCapture({ value, onPhotoReady, disabled = false }: PatientPhotoCaptureProps) {
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setError("No se pudo acceder a la cámara. Puedes seleccionar una foto manualmente.");
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const maxSide = 1280;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) {
      setError("No se pudo procesar la foto.");
      return;
    }
    onPhotoReady(new File([blob], `paciente-${Date.now()}.jpg`, { type: "image/jpeg" }));
    stopCamera();
  };

  return (
    <Stack gap="xs">
      <Text fw={600}>Foto del paciente</Text>
      <Text size="sm" c="dimmed">Opcional. El permiso de cámara se solicita solo al pulsar “Abrir cámara”.</Text>
      {error ? <Alert color="yellow">{error}</Alert> : null}
      {cameraActive ? (
        <Stack gap="xs">
          <video ref={videoRef} playsInline muted className={styles.video} />
          <Group>
            <Button leftSection={<IconCamera size={16} />} onClick={() => void capturePhoto()} disabled={disabled}>Tomar foto</Button>
            <Button variant="light" color="gray" onClick={stopCamera}>Cancelar</Button>
          </Group>
        </Stack>
      ) : previewUrl ? (
        <Stack gap="xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Vista previa del paciente" className={styles.preview} />
          <Group>
            <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => void startCamera()} disabled={disabled}>Repetir</Button>
            <Button variant="subtle" color="red" leftSection={<IconX size={16} />} onClick={() => onPhotoReady(null)} disabled={disabled}>Quitar</Button>
          </Group>
        </Stack>
      ) : (
        <Group>
          <Button leftSection={<IconCamera size={16} />} onClick={() => void startCamera()} disabled={disabled}>Abrir cámara</Button>
          <FileButton onChange={onPhotoReady} accept="image/jpeg,image/png,image/webp">
            {(props) => <Button {...props} variant="light" leftSection={<IconPhoto size={16} />} disabled={disabled}>Elegir foto</Button>}
          </FileButton>
        </Group>
      )}
    </Stack>
  );
}
