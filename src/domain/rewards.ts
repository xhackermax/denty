import type { Cents } from "./money";

export function rewardCents(playedGames: number): Cents {
  const count = Math.max(0, Math.floor(Number(playedGames) || 0));
  return Math.min(500, Math.floor(count / 3) * 100);
}

export function patientLabel(recordNumber: string | number): string {
  const normalized = String(recordNumber).replace(/\D/g, "");
  return `Ficha ••${normalized.slice(-4).padStart(4, "0")}`;
}
