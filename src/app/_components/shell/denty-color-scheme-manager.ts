import type { MantineColorSchemeManager } from "@mantine/core";

import {
  DENTY_APPEARANCE_STORAGE_KEY,
  isDentyAppearancePreference,
  resolveAppearanceScheme,
} from "@/domain/appearance-schedule";

/**
 * Mantine owns the DOM attribute, while Denty owns the persisted preference.
 * Keeping Mantine's manager memory-only prevents a second localStorage value
 * from overwriting the schedule or a manual Denty selection during hydration.
 */
export const dentyColorSchemeManager: MantineColorSchemeManager = {
  get(defaultValue) {
    if (typeof window === "undefined") return defaultValue;

    const stored = window.localStorage.getItem(DENTY_APPEARANCE_STORAGE_KEY);
    return resolveAppearanceScheme(isDentyAppearancePreference(stored) ? stored : "time");
  },
  set() {},
  subscribe() {},
  unsubscribe() {},
  clear() {},
};
