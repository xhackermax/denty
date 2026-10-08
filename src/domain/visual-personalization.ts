/**
 * Denty UI-only visual preferences.
 * The nine numbered palette swatches are transcribed from Hostinger's
 * "Las 30 mejores paletas de colores para páginas web" (2025).
 * Adapted contrast/action colors are deliberately handled in CSS, not
 * included in the source palette swatches.
 */
export const VISUAL_PREFERENCES_KEY = "denty.ui.visual.v1";
export const VISUAL_PREFERENCES_EVENT = "denty:visual-preferences-change";

export const VISUAL_PALETTES = [
  {
    id: "denty",
    number: null,
    name: "Denty original",
    description: "Azul clínico y superficies neutras.",
    colors: ["#007AFF", "#F5F5F7", "#1D1D1F"],
  },
  {
    id: "27",
    number: 27,
    name: "Coral y violeta",
    description: "Blanco, naranja ocaso y rojo-violeta. Flat y expresivo.",
    colors: ["#FFFFFF", "#FF5841", "#C53678"],
  },
  {
    id: "25",
    number: 25,
    name: "Verde tecnológico",
    description: "Base verde profundo con turquesa claro.",
    colors: ["#0C1A1A", "#6ACFC7"],
  },
  {
    id: "22",
    number: 22,
    name: "Morado minimalista",
    description: "Blanco y morado tirio, discreto y elegante.",
    colors: ["#FFFFFF", "#4F0341"],
  },
  {
    id: "19",
    number: 19,
    name: "Azul y oro",
    description: "Azul real oscuro y acentos dorados.",
    colors: ["#002349", "#957C3D"],
  },
  {
    id: "17",
    number: 17,
    name: "Nocturno turquesa",
    description: "Azul clásico, turquesa y dorado.",
    colors: ["#0A1828", "#178582", "#BFA181"],
  },
  {
    id: "15",
    number: 15,
    name: "Bruma azul",
    description: "Gris azulado suave y blanco.",
    colors: ["#96C2DB", "#E5EDF1", "#FFFFFF"],
  },
  {
    id: "14",
    number: 14,
    name: "Arena y naranja",
    description: "Beige cálido, naranja intenso y blanco.",
    colors: ["#CD9C8A", "#FF5100", "#FFFFFF"],
  },
  {
    id: "10",
    number: 10,
    name: "Rosa y azul marino",
    description: "Dos rosas suaves y azul profundo.",
    colors: ["#E1B0AC", "#F2D4D6", "#213F99"],
  },
  {
    id: "6",
    number: 6,
    name: "Lima puro",
    description: "Verde lima sobre blanco.",
    colors: ["#00DD00", "#FFFFFF"],
  },
] as const;

export const VISUAL_WALLPAPERS = [
  { id: "none", name: "Liso", description: "El fondo original de Denty." },
  { id: "aurora", name: "Degradado de lujo", description: "Fondo nacarado con curvas luminosas." },
  { id: "silk", name: "Seda 3D", description: "Capas curvas, reflejos y volumen tridimensional." },
  { id: "mesh", name: "Malla digital", description: "Red tridimensional en perspectiva con puntos luminosos." },
] as const;

export type VisualPaletteId = (typeof VISUAL_PALETTES)[number]["id"];
export type VisualWallpaperId = (typeof VISUAL_WALLPAPERS)[number]["id"];
export interface VisualPreferences {
  palette: VisualPaletteId;
  wallpaper: VisualWallpaperId;
  animations: boolean;
}
export const DEFAULT_VISUAL_PREFERENCES: Readonly<VisualPreferences> = Object.freeze({
  palette: "denty",
  wallpaper: "none",
  animations: true,
});

export function isVisualPaletteId(value: unknown): value is VisualPaletteId {
  return typeof value === "string" && VISUAL_PALETTES.some((palette) => palette.id === value);
}

export function isVisualWallpaperId(value: unknown): value is VisualWallpaperId {
  return typeof value === "string" && VISUAL_WALLPAPERS.some((wallpaper) => wallpaper.id === value);
}

export function parseVisualPreferences(raw: string | null): VisualPreferences {
  if (!raw || raw.length > 2048) return { ...DEFAULT_VISUAL_PREFERENCES };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ...DEFAULT_VISUAL_PREFERENCES };
    }
    const candidate = value as Partial<VisualPreferences>;
    return {
      palette: isVisualPaletteId(candidate.palette) ? candidate.palette : "denty",
      wallpaper: isVisualWallpaperId(candidate.wallpaper) ? candidate.wallpaper : "none",
      animations: typeof candidate.animations === "boolean" ? candidate.animations : true,
    };
  } catch {
    return { ...DEFAULT_VISUAL_PREFERENCES };
  }
}
