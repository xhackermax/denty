import { createTheme, type MantineColorsTuple } from "@mantine/core";

const teal: MantineColorsTuple = [
  "#e6f7f7",
  "#cceeed",
  "#99dddb",
  "#63cbc8",
  "#36b8b4",
  "#16a4a1",
  "#008d8a",
  "#007572",
  "#005d5b",
  "#004846",
];

export const dentyTheme = createTheme({
  primaryColor: "dentyTeal",
  primaryShade: { light: 6, dark: 5 },
  colors: { dentyTeal: teal },
  autoContrast: true,
  luminanceThreshold: 0.3,
  defaultRadius: "md",
  fontFamily: "var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif",
  headings: {
    fontFamily: "var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif",
    fontWeight: "700",
  },
  cursorType: "pointer",
  respectReducedMotion: true,
});
