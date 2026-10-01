// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { printPerioChart, PerioPrint } from "../perio-print";
afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});
test("prints only a cloned selected chart without hiding other clinical pages", () => {
  const other = document.createElement("div");
  other.textContent = "Other patient private page";
  document.body.append(other);
  const chart = document.createElement("section");
  chart.textContent = "Selected exam";
  const input = document.createElement("input");
  input.type = "number";
  input.value = "6";
  chart.append(input);
  for (const checked of [true, false]) {
    const flag = document.createElement("input");
    flag.type = "checkbox";
    flag.checked = checked;
    chart.append(flag);
  }
  const control = document.createElement("button");
  control.textContent = "Editing control";
  chart.append(control);
  const style = document.createElement("style");
  style.textContent = ".clinical-print-sample { color: red; }";
  document.head.append(style);
  const table = document.createElement("table"),
    th = document.createElement("th"),
    button = document.createElement("button");
  button.textContent = "18";
  th.append(button);
  table.append(th);
  chart.append(table);
  document.body.append(chart);
  const frame = printPerioChart(chart);
  expect(frame).toBeDefined();
  if (!frame) return;
  expect(frame.contentDocument?.body.textContent).toContain("Selected exam");
  expect(frame.contentDocument?.body.textContent).toContain("6");
  expect(frame.contentDocument?.body.textContent).toContain("18");
  expect(frame.contentDocument?.body.textContent).toContain("✓—");
  expect(frame.contentDocument?.body.textContent).not.toContain("Editing control");
  expect(frame.contentDocument?.head.textContent).toContain("clinical-print-sample");
  style.remove();
  expect(frame.contentDocument?.body.textContent).not.toContain("Other patient");
  const print = vi.fn();
  frame.contentWindow!.print = print;
  frame.contentWindow!.focus = vi.fn();
  fireEvent.load(frame);
  expect(print).toHaveBeenCalledTimes(1);
  fireEvent.load(frame);
  expect(print).toHaveBeenCalledTimes(1);
  frame.contentWindow!.dispatchEvent(new Event("afterprint"));
  expect(frame.isConnected).toBe(false);
  expect(other).toBeVisible();
});

test("print button waits for its target and clones the selected examination", () => {
  const target: { current: HTMLElement | null } = { current: null };
  const { rerender } = render(
    <MantineProvider>
      <PerioPrint target={target} />
    </MantineProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Imprimir periodontograma" }));
  expect(document.querySelector("iframe")).toBe(null);
  target.current = document.createElement("section");
  target.current.textContent = "Patient's chosen examination";
  rerender(
    <MantineProvider>
      <PerioPrint target={target} />
    </MantineProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Imprimir periodontograma" }));
  const frame = document.querySelector("iframe")!;
  frame.contentWindow!.focus = vi.fn();
  frame.contentWindow!.print = vi.fn();
  expect(frame.contentDocument?.body.textContent).toContain("Patient's chosen examination");
  frame.remove();
  fireEvent.load(frame);
});
