// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { VISUAL_PREFERENCES_KEY } from "@/domain/visual-personalization";
import { VisualPersonalizationPanel } from "@/features/parity/modules/visual-personalization-panel";
import { VisualPreferencesProvider } from "../visual-preferences-provider";

function mount() {
  render(
    <MantineProvider env="test">
      <VisualPreferencesProvider>
        <VisualPersonalizationPanel />
      </VisualPreferencesProvider>
    </MantineProvider>,
  );
}

describe("visual personalization UI", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-denty-palette");
    document.documentElement.removeAttribute("data-denty-wallpaper");
    document.documentElement.removeAttribute("data-denty-animations");
  });

  afterEach(cleanup);

  it("updates palette and wallpaper live and persists the choice", async () => {
    mount();
    const palette = screen.getByRole("button", { name: "Seleccionar paleta 19, Azul y oro" });
    fireEvent.click(palette);
    expect(palette).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(document.documentElement.dataset.dentyPalette).toBe("19"));

    const mesh = screen.getByRole("button", { name: "Seleccionar fondo Malla digital" });
    fireEvent.click(mesh);
    expect(mesh).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(document.documentElement.dataset.dentyWallpaper).toBe("mesh"));
    expect(JSON.parse(localStorage.getItem(VISUAL_PREFERENCES_KEY) ?? "{}")).toMatchObject({
      palette: "19",
      wallpaper: "mesh",
      animations: true,
    });
  });

  it("disables movement without changing any clinic data and resets to the original", async () => {
    mount();
    const toggle = screen.getByRole("switch", { name: "Activar animaciones" });
    fireEvent.click(toggle);
    await waitFor(() => expect(document.documentElement.dataset.dentyAnimations).toBe("off"));
    fireEvent.click(screen.getByRole("button", { name: "Restablecer" }));
    await waitFor(() => expect(document.documentElement.dataset.dentyAnimations).toBe("on"));
    expect(document.documentElement.dataset.dentyPalette).toBe("denty");
    expect(document.documentElement.dataset.dentyWallpaper).toBe("none");
  });
});
