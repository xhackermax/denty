import { createTheme, type MantineColorsTuple } from "@mantine/core";

const iosBlue: MantineColorsTuple = [
  "#edf6ff",
  "#d9ecff",
  "#b4d8ff",
  "#8ac2ff",
  "#5faaff",
  "#3191ff",
  "#007aff",
  "#0068db",
  "#0054b4",
  "#003f8c",
];

export const dentyTheme = createTheme({
  primaryColor: "dentyBlue",
  primaryShade: { light: 6, dark: 6 },
  colors: { dentyBlue: iosBlue },
  autoContrast: true,
  luminanceThreshold: 0.3,
  defaultRadius: "md",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif',
  headings: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif',
    fontWeight: "720",
  },
  cursorType: "pointer",
  respectReducedMotion: true,
});
