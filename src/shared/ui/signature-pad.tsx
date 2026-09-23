"use client";
import { Button, Group, Stack, Text } from "@mantine/core";
import { useEffect, useRef } from "react";
import styles from "./signature-pad.module.css";
export function SignaturePad({
  onChange,
  label = "Firma manuscrita",
}: {
  onChange: (dataUrl: string | null) => void;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const inkRef = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(160 * ratio));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#17324d";
  }, []);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const begin = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    drawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    context.beginPath();
    context.moveTo(p.x, p.y);
  };
  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const p = point(event);
    context.lineTo(p.x, p.y);
    context.stroke();
    inkRef.current = true;
  };
  const end = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const dataUrl = event.currentTarget.toDataURL("image/png");
    onChange(inkRef.current ? dataUrl : null);
  };
  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    inkRef.current = false;
    onChange(null);
  };
  return (
    <Stack gap="xs">
      <Text size="sm" fw={700}>
        {label}
      </Text>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Área para firma manuscrita"
        onPointerDown={begin}
        onPointerMove={draw}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          Firma con ratón, lápiz o dedo.
        </Text>
        <Button size="xs" variant="subtle" onClick={clear}>
          Limpiar
        </Button>
      </Group>
    </Stack>
  );
}
