import { z } from "zod";

export const NAVIGATION_KEYS = [
  "home",
  "patients",
  "agenda",
  "documents",
  "finance",
  "laboratory",
  "prescriptions",
  "communications",
  "recovery",
  "clinic-contacts",
  "tasks",
  "analysis",
  "incidents",
  "campaigns",
  "alerts",
  "attendance",
  "settings",
  "admin",
] as const;

export type NavigationKey = (typeof NAVIGATION_KEYS)[number];

export const DEFAULT_PINNED: readonly NavigationKey[] = [
  "home",
  "patients",
  "agenda",
  "documents",
  "finance",
];
// The desktop sidebar stays scannable without scrolling on a 768 px-tall screen.
export const MAX_PINNED = 8;
// Five tabs plus “Más” is what fits a 360 px phone with readable labels.
export const MOBILE_BAR_SIZE = 5;

export type NavigationSource = "user" | "clinic" | "default";
export interface NavigationLayout {
  pinned: readonly NavigationKey[];
}

const known = new Set<string>(NAVIGATION_KEYS);
const isKey = (value: unknown): value is NavigationKey =>
  typeof value === "string" && known.has(value);

/** Stored layouts outlive releases: keys that no longer exist are dropped, never an error. */
export function sanitizePinned(value: unknown): NavigationKey[] | null {
  if (!Array.isArray(value)) return null;
  const pinned = [...new Set(value.filter(isKey))].slice(0, MAX_PINNED);
  return pinned.length > 0 ? pinned : null;
}

export function resolvePinned(input: {
  user: { pinned?: unknown } | null;
  clinic: { pinned?: unknown } | null;
}): { pinned: NavigationKey[]; source: NavigationSource } {
  const user = sanitizePinned(input.user?.pinned);
  if (user) return { pinned: user, source: "user" };
  const clinic = sanitizePinned(input.clinic?.pinned);
  if (clinic) return { pinned: clinic, source: "clinic" };
  return { pinned: [...DEFAULT_PINNED], source: "default" };
}

export function splitForBar(pinned: readonly NavigationKey[], size: number) {
  return { bar: pinned.slice(0, size), overflow: pinned.slice(size) };
}

export function moveKey(
  pinned: readonly NavigationKey[],
  key: NavigationKey,
  offset: -1 | 1,
): NavigationKey[] {
  const from = pinned.indexOf(key);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= pinned.length) return [...pinned];
  const next = [...pinned];
  next.splice(from, 1);
  next.splice(to, 0, key);
  return next;
}

export function togglePinned(
  pinned: readonly NavigationKey[],
  key: NavigationKey,
): NavigationKey[] {
  if (pinned.includes(key)) {
    // An empty bar would leave only “Más”: keep at least one direct destination.
    return pinned.length > 1 ? pinned.filter((item) => item !== key) : [...pinned];
  }
  return pinned.length < MAX_PINNED ? [...pinned, key] : [...pinned];
}

/** `pinned: null` clears the layout so the next level (clinic, then default) applies. */
export const navigationLayoutSchema = z.object({
  pinned: z
    .array(z.enum(NAVIGATION_KEYS))
    .min(1)
    .max(MAX_PINNED)
    .refine((keys) => new Set(keys).size === keys.length, "Hay apartados repetidos.")
    .nullable(),
});
