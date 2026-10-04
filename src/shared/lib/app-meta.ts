import type { Viewport } from "next";

export const APP_NAME = "Denty" as const;
export const APP_VERSION = "3.0.0" as const;

export function buildLabel(version: string): string {
  return `${APP_NAME} v${version}`;
}

// Matches --denty-bg in each scheme so the status bar reads as part of the app.
export const THEME_COLORS = { light: "#f5f5f7", dark: "#000000" } as const;

// viewport-fit=cover makes env(safe-area-inset-*) non-zero so the phone tab bar clears the home
// indicator. Zoom stays enabled: inputs are 16 px on touch screens instead (global.css).
export const APP_VIEWPORT = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  // OS-scheme defaults for first paint; theme-color.ts switches them to Denty's own scheme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
} as const satisfies Viewport;
