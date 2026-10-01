import { expect, test } from "vitest";
import { contactPhoneLinks, contactEmailLink } from "../contact-links";
test("normalizes international phones without inventing a country", () => {
  expect(contactPhoneLinks("+34 600 111 222")).toEqual({
    tel: "tel:+34600111222",
    whatsapp: "https://wa.me/34600111222",
  });
  expect(contactPhoneLinks("600 111 222")?.whatsapp).toBeNull();
  expect(contactPhoneLinks("n/a")).toBeNull();
});
test("validates email destinations", () => {
  expect(contactEmailLink("ana@example.com")).toBe("mailto:ana@example.com");
  expect(contactEmailLink("bad\nname@example.com")).toBeNull();
  expect(contactEmailLink("")).toBeNull();
});
