export interface SpeedingMetricTriggerState {
  hasScrolled: boolean;
  inView: boolean;
  reducedMotion: boolean;
  hasPlayed: boolean;
}

export function shouldStartSpeedingMetric({
  hasScrolled,
  inView,
  reducedMotion,
  hasPlayed,
}: SpeedingMetricTriggerState): boolean {
  return hasScrolled && inView && !reducedMotion && !hasPlayed;
}
