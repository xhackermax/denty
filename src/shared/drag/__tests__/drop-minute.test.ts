import { expect, test } from "vitest";
import { dropMinute } from "../drop-minute";
test("snaps pointer/touch/keyboard drag identically and clamps the whole appointment to the day", () => {
  expect(
    dropMinute({
      initialTop: 100,
      deltaY: 22,
      columnTop: 40,
      pixelsPerMinute: 2,
      dayMinutes: 720,
      duration: 30,
    }),
  ).toBe(45);
  expect(
    dropMinute({
      initialTop: 0,
      deltaY: -100,
      columnTop: 40,
      pixelsPerMinute: 2,
      dayMinutes: 720,
      duration: 30,
    }),
  ).toBe(0);
  expect(
    dropMinute({
      initialTop: 100,
      deltaY: 2000,
      columnTop: 40,
      pixelsPerMinute: 2,
      dayMinutes: 720,
      duration: 30,
    }),
  ).toBe(690);
  expect(() =>
    dropMinute({
      initialTop: 0,
      deltaY: 1,
      columnTop: 0,
      pixelsPerMinute: 0,
      dayMinutes: 720,
      duration: 30,
    }),
  ).toThrow();
});
test("duration without a 15-minute multiple remains within day after calendar snapping", () => {
  expect(
    dropMinute({
      initialTop: 0,
      deltaY: 2000,
      columnTop: 0,
      pixelsPerMinute: 2,
      dayMinutes: 720,
      duration: 37,
    }),
  ).toBe(675);
});
test.each([
  { pixelsPerMinute: Number.NaN, dayMinutes: 720, duration: 30 },
  { pixelsPerMinute: 2, dayMinutes: 720, duration: 0 },
  { pixelsPerMinute: 2, dayMinutes: 20, duration: 30 },
])("rejects invalid geometry %o", (input) => {
  expect(() => dropMinute({ initialTop: 0, deltaY: 0, columnTop: 0, ...input })).toThrow();
});
