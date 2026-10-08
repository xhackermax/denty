import "@mantine/core/styles.css";

import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import { ES_MESSAGES } from "@/i18n/messages";
import { APP_NAME, APP_VIEWPORT } from "@/shared/lib/app-meta";
import "@/styles/global.css";

import { Providers } from "./providers";

const timeColorSchemeScript = `
(function () {
  try {
    var preference = localStorage.getItem("denty-appearance");
    var scheme = preference === "light" || preference === "dark" ? preference : null;
    if (!scheme) {
      var parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Madrid",
        hour: "2-digit",
        hourCycle: "h23"
      }).formatToParts(new Date());
      var hourPart = parts.find(function (part) { return part.type === "hour"; });
      var hour = Number(hourPart && hourPart.value);
      scheme = hour >= 7 && hour < 21 ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-mantine-color-scheme", scheme);
  } catch {
    document.documentElement.setAttribute("data-mantine-color-scheme", "light");
  }
})();`;

const visualPreferenceScript = `
(function () {
  try {
    var raw = localStorage.getItem("denty.ui.visual.v1");
    if (!raw || raw.length > 2048) return;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
    var palettes = ["denty", "27", "25", "22", "19", "17", "15", "14", "10", "6"];
    var wallpapers = ["none", "aurora", "silk", "mesh"];
    var root = document.documentElement;
    if (palettes.includes(parsed.palette)) root.dataset.dentyPalette = parsed.palette;
    if (wallpapers.includes(parsed.wallpaper)) root.dataset.dentyWallpaper = parsed.wallpaper;
    if (typeof parsed.animations === "boolean") {
      root.dataset.dentyAnimations = parsed.animations ? "on" : "off";
    }
  } catch {
    // Unavailable/invalid browser preference never blocks the app.
  }
})();`;

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: ES_MESSAGES.Shell.brandSubtitle,
  icons: { icon: "/assets/denty-logo.png" },
};

export const viewport: Viewport = APP_VIEWPORT;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" data-density="comfortable" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
        <script dangerouslySetInnerHTML={{ __html: timeColorSchemeScript }} />
        <script dangerouslySetInnerHTML={{ __html: visualPreferenceScript }} />
      </head>
      <body className={inter.variable}>
        <Providers messages={ES_MESSAGES}>{children}</Providers>
      </body>
    </html>
  );
}
