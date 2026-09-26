export const PATIENT_CAROUSEL_SCROLL_SETTLE_MS = 180;

interface InfiniteCarouselRecenteringInput {
  copy: number;
  cycleSpan: number;
  settled: boolean;
}

export function getInfiniteCarouselRecenteringDelta({
  copy,
  cycleSpan,
  settled,
}: InfiniteCarouselRecenteringInput): number {
  if (!settled || cycleSpan <= 0) return 0;
  if (copy === 0) return cycleSpan;
  if (copy === 2) return -cycleSpan;
  return 0;
}
