/** Prints a standalone HTML page through a hidden frame. */
export function printHtml(html: string): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.title = "Impresion";
  frame.className = "denty-print-frame";
  frame.width = "0";
  frame.height = "0";
  frame.style.position = "fixed";
  frame.style.border = "0";
  frame.style.inset = "auto auto 0 0";
  frame.tabIndex = -1;

  document.body.appendChild(frame);

  const targetDocument = frame.contentDocument ?? frame.contentWindow?.document;
  if (!targetDocument) {
    frame.remove();
    throw new Error("No se pudo preparar el documento para imprimir.");
  }

  targetDocument.open();
  targetDocument.write(html);
  targetDocument.close();

  const printFrame = () => {
    const view = frame.contentWindow;
    if (!view) return;
    const cleanup = () => window.setTimeout(() => frame.remove(), 500);
    view.addEventListener("afterprint", cleanup, { once: true });
    view.focus();
    view.print();
    // Some browsers do not fire afterprint for the frame: remove it anyway later.
    window.setTimeout(() => frame.isConnected && frame.remove(), 60_000);
  };

  // Chrome can print a blank page if print() runs before the frame has painted.
  window.setTimeout(printFrame, 0);
}
