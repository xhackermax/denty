import type { DentyColorScheme } from "@/domain/appearance-schedule";
import { THEME_COLORS } from "@/shared/lib/app-meta";

/**
 * Denty picks its scheme by time of day or by preference, not by the OS, so the per-media
 * theme-color tags would follow the wrong scheme. Point every tag at the active one.
 */
export function syncThemeColor(scheme: DentyColorScheme, doc: Document = document): void {
  for (const meta of doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = THEME_COLORS[scheme];
  }
}
