import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { ES_MESSAGES } from "@/i18n/messages";
import { PRIMARY_NAV, SECONDARY_NAV } from "./navigation";

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
