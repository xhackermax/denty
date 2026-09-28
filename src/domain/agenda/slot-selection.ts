export function slotMinuteFromOffset(
  offsetPx: number,
  pxPerMinute: number,
  slotMinutes: number,
  dayMinutes: number,
): number {
  if (!Number.isFinite(offsetPx) || !Number.isFinite(pxPerMinute) || pxPerMinute <= 0) {
    throw new RangeError("La posición y la escala de agenda deben ser válidas");
  }
  if (!Number.isFinite(slotMinutes) || slotMinutes <= 0) {
    throw new RangeError("El intervalo de agenda debe ser válido");
  }
  if (!Number.isFinite(dayMinutes) || dayMinutes <= slotMinutes) {
    throw new RangeError("La duración del día debe ser válida");
  }

  const rawMinutes = Math.max(0, offsetPx / pxPerMinute);
  const slotStart = Math.floor(rawMinutes / slotMinutes) * slotMinutes;
  return Math.min(dayMinutes - slotMinutes, slotStart);
}
