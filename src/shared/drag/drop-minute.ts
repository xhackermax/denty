export function dropMinute(input: {
  initialTop: number;
  deltaY: number;
  columnTop: number;
  pixelsPerMinute: number;
  dayMinutes: number;
  duration: number;
}) {
  if (
    Object.values(input).some((value) => !Number.isFinite(value)) ||
    input.pixelsPerMinute <= 0 ||
    input.duration <= 0 ||
    input.dayMinutes < input.duration
  )
    throw new RangeError("Posición de cita inválida.");
  const raw = (input.initialTop + input.deltaY - input.columnTop) / input.pixelsPerMinute;
  return Math.max(
    0,
    Math.min(Math.floor((input.dayMinutes - input.duration) / 15) * 15, Math.round(raw / 15) * 15),
  );
}
