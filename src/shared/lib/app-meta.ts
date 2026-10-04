import type { Viewport } from "next";

export const APP_NAME = "Denty" as const;
export const APP_VERSION = "3.0.0" as const;

export function buildLabel(version: string): string {
  return `${APP_NAME} v${version}`;
}

// viewport-fit=cover makes env(safe-area-inset-*) non-zero so the phone tab bar clears the home
// indicator. Zoom stays enabled: inputs are 16 px on touch screens instead (global.css).
export const APP_VIEWPORT = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  // The status bar follows --denty-bg so it reads as part of the app, not the browser.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
} as const satisfies Viewport;
