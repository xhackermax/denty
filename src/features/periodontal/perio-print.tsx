import type { RefObject } from "react";
import { Button } from "@mantine/core";
import styles from "./perio-chart.module.css";

/** Isolate the selected examination so printing another page never inherits chart visibility rules. */
export function printPerioChart(node: HTMLElement): HTMLIFrameElement {
  const frame = document.createElement("iframe");
  frame.className = styles.printFrame!;
  frame.title = "Impresión del periodontograma";
  document.body.append(frame);
  const target = frame.contentDocument!;
  target.open();
  target.write(
    "<!doctype html><html><head><title>Periodontograma</title></head><body></body></html>",
  );
  target.close();
  document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((style) => {
    target.head.append(style.cloneNode(true));
  });
  const clone = node.cloneNode(true) as HTMLElement;
  const originals = node.querySelectorAll<HTMLInputElement>("input");
  clone.querySelectorAll<HTMLInputElement>("input").forEach((input, index) => {
    const original = originals[index]!;
    const value = target.createElement("span");
    value.textContent =
      original.type === "checkbox" ? (original.checked ? "✓" : "—") : original.value;
    input.replaceWith(value);
  });
  clone.querySelectorAll("button").forEach((element) => {
    if (element.closest("th"))
      element.replaceWith(target.createTextNode(element.textContent ?? ""));
    else element.remove();
  });
  clone.querySelectorAll("select, [data-print-hide]").forEach((element) => element.remove());
  target.body.append(clone);
  target.documentElement.className = "perioPrintDocument";
  const printStyle = target.createElement("style");
  printStyle.textContent =
    "@page{size:A4 landscape;margin:8mm} body{margin:0;color:#111;background:white} .perioPrintDocument section{border:0} .perioPrintDocument table{font-size:9px} .perioPrintDocument div{overflow:visible} tr{break-inside:avoid} svg{max-width:85px}";
  target.head.append(printStyle);
  let printed = false;
  frame.addEventListener("load", () => {
    if (printed || !frame.isConnected) return;
    printed = true;
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
  });
  frame.contentWindow!.addEventListener("afterprint", () => frame.remove(), { once: true });
  return frame;
}
export function PerioPrint({ target }: { target: RefObject<HTMLElement | null> }) {
  return (
    <Button
      variant="subtle"
      onClick={() => {
        if (target.current) printPerioChart(target.current);
      }}
    >
      Imprimir periodontograma
    </Button>
  );
}
