import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { ES_MESSAGES } from "@/i18n/messages";
import { NAVIGATION_KEYS } from "@/domain/navigation";
import { NAV_ITEMS, PRIMARY_NAV, SECONDARY_NAV, moreSections, navItemsFor } from "../catalog";

describe("navigation translations", () => {
  const translate = createTranslator({
    locale: "es",
    messages: ES_MESSAGES,
    namespace: "Navigation",
    onError(error) {
      throw error;
    },
  });
  it.each([...PRIMARY_NAV, ...SECONDARY_NAV])("translates $key", ({ key }) => {
    expect(translate(key)).not.toBe(`Navigation.${key}`);
  });
});

describe("navigation catalogue", () => {
  it("has exactly one destination for every navigation key", () => {
    expect(Object.keys(NAV_ITEMS).sort()).toEqual([...NAVIGATION_KEYS].sort());
    expect(navItemsFor(["agenda", "home"]).map((item) => item.href)).toEqual([
      "/app/agenda",
      "/app",
    ]);
  });

  it("lists in “Más” only what the bar does not show, grouped by section", () => {
    const sections = moreSections(["home", "agenda", "tasks"]);
    const keys = sections.flatMap((section) => section.items.map((item) => item.key));
    expect(keys).not.toContain("home");
    expect(keys).not.toContain("tasks");
    expect(keys).toContain("patients");
    expect(sections[0]?.key).toBe("general");
    expect(sections.find((section) => section.key === "management")?.items[0]?.key).toBe(
      "clinic-contacts",
    );
  });

  it("drops empty sections", () => {
    const sections = moreSections(NAVIGATION_KEYS.filter((key) => key !== "settings"));
    expect(sections).toEqual([{ key: "system", items: [NAV_ITEMS.settings] }]);
  });
});
