import { Select, createTheme, type MantineColorsTuple } from "@mantine/core";

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

// Mantine's teal from shade 7 on, darkened so white labels on filled buttons clear 4.5:1
// (#0ca678 was 3.1:1; #087f5b is 5.0:1). Lighter shades, used for tints, are unchanged.
const accessibleTeal: MantineColorsTuple = [
  "#e6fcf5",
  "#c3fae8",
  "#96f2d7",
  "#63e6be",
  "#38d9a9",
  "#20c997",
  "#12b886",
  "#087f5b",
  "#076b4d",
  "#065a41",
];

export const dentyTheme = createTheme({
  primaryColor: "dentyBlue",
  // Shade 7 (#0068db) keeps white button labels at 5.2:1; shade 6 (#007aff) was 4.0:1.
  primaryShade: { light: 7, dark: 7 },
  // color="blue" used Mantine's own blue (#228be6, 3.6:1 under white text); one blue for all.
  colors: { dentyBlue: iosBlue, blue: iosBlue, teal: accessibleTeal },
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
  components: {
    // Re-choosing the option already selected must not empty the field: in the odontogram it
    // silently fell back to another tooth. Fields that may be emptied opt in with `clearable`.
    Select: Select.extend({ defaultProps: { allowDeselect: false } }),
  },
});
