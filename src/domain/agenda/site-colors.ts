/** Number of distinct site colours defined as `--denty-site-N` tokens. */
export const SITE_COLOR_COUNT = 8;

/**
 * Colour slot (1..SITE_COLOR_COUNT) for each site, assigned in the order the clinic
 * lists its sites so a site keeps the same colour in every screen and session.
 * Beyond SITE_COLOR_COUNT sites the palette repeats.
 */
export function siteColorSlots(siteIds: readonly string[]): ReadonlyMap<string, number> {
  const slots = new Map<string, number>();
  for (const id of siteIds) {
    if (!slots.has(id)) slots.set(id, (slots.size % SITE_COLOR_COUNT) + 1);
  }
  return slots;
}
