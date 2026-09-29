import { toMadridISO } from "./dates";
export interface TimeRange {
  start: string;
  end: string;
}
export interface AvailabilityInput {
  windowStart: string;
  windowEnd: string;
  durationMinutes: number;
  intervalMinutes: number;
  busy?: readonly TimeRange[];
  blocks?: readonly TimeRange[];
  limit?: number;
}
const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;
export function findAvailableSlots(input: AvailabilityInput): TimeRange[] {
  if (input.durationMinutes <= 0 || input.intervalMinutes <= 0)
    throw new RangeError("Duración e intervalo deben ser positivos");
  const start = Date.parse(input.windowStart),
    end = Date.parse(input.windowEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end)
    throw new RangeError("Ventana de disponibilidad inválida");
  const duration = input.durationMinutes * 60000,
    step = input.intervalMinutes * 60000,
    exclusions = [...(input.busy ?? []), ...(input.blocks ?? [])].map(
      (x) => [Date.parse(x.start), Date.parse(x.end)] as const,
    );
  const out: TimeRange[] = [];
  for (let cursor = start; cursor + duration <= end; cursor += step) {
    const stop = cursor + duration;
    if (exclusions.some(([a, b]) => overlaps(cursor, stop, a, b))) continue;
    out.push({ start: toMadridISO(cursor), end: toMadridISO(stop) });
    if (out.length >= (input.limit ?? 6)) break;
  }
  return out;
}
