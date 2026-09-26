import assert from "node:assert/strict";

import {
  getInfiniteCarouselRecenteringDelta,
  PATIENT_CAROUSEL_SCROLL_SETTLE_MS,
} from "../src/features/patients/patient-carousel-loop.ts";

assert.equal(
  getInfiniteCarouselRecenteringDelta({ copy: 2, cycleSpan: 1200, settled: false }),
  0,
  "the last→first transition must not recenter while smooth scrolling is still moving",
);
assert.equal(
  getInfiniteCarouselRecenteringDelta({ copy: 2, cycleSpan: 1200, settled: true }),
  -1200,
  "after scrolling settles, the bottom clone should normalize to the equivalent middle copy",
);
assert.equal(
  getInfiniteCarouselRecenteringDelta({ copy: 0, cycleSpan: 1200, settled: true }),
  1200,
  "after scrolling settles, the top clone should normalize to the equivalent middle copy",
);
assert.equal(
  getInfiniteCarouselRecenteringDelta({ copy: 1, cycleSpan: 1200, settled: true }),
  0,
  "the middle copy should never be repositioned",
);
assert.ok(
  PATIENT_CAROUSEL_SCROLL_SETTLE_MS >= 100,
  "the settle delay must be long enough to happen after the last smooth-scroll frame",
);

console.log("patient carousel infinite-loop regression: OK");
