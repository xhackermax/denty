const PRINT_ERROR =
  "No se pudo abrir el diálogo de impresión. Revisa los bloqueadores de ventanas.";
const IMAGE_WAIT_MS = 2_000;
const FRAME_CLEANUP_MS = 60_000;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function createFrame(): HTMLIFrameElement {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.title = "Impresion";
  frame.className = "denty-print-frame";
  // A 0x0 frame prints blank in Firefox/Safari: keep a real size but invisible.
  frame.width = "1";
  frame.height = "1";
  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });
  frame.tabIndex = -1;
  return frame;
}

async function printInFrame(html: string): Promise<void> {
  const frame = createFrame();
  document.body.appendChild(frame);
  const keepAlive = window.setTimeout(() => frame.isConnected && frame.remove(), FRAME_CLEANUP_MS);
  try {
    const view = frame.contentWindow;
    const target = frame.contentDocument ?? view?.document;
    if (!view || !target) throw new Error(PRINT_ERROR);
    target.open();
    target.write(html);
    target.close();
    // Chrome prints a blank page if print() runs before the frame has painted.
    await wait(0);
    const pending = Array.from(target.images ?? []).some((image) => !image.complete);
    if (pending) await wait(IMAGE_WAIT_MS);
    view.focus();
    view.print();
  } catch (error) {
    window.clearTimeout(keepAlive);
    frame.remove();
    throw error;
  }
}

function printInPopup(html: string): void {
  const popup = window.open("", "_blank", "width=900,height=700");
  if (!popup) throw new Error(PRINT_ERROR);
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
}

/**
 * Prints a standalone HTML page: hidden frame first, popup window as fallback.
 * Rejects with a user-readable message when neither can print, so callers can
 * tell the user instead of failing silently.
 */
export async function printHtml(html: string): Promise<void> {
  try {
    await printInFrame(html);
    return;
  } catch {
    // Some browsers/extensions block printing from frames; try a popup.
  }
  try {
    printInPopup(html);
  } catch {
    throw new Error(PRINT_ERROR);
  }
}
