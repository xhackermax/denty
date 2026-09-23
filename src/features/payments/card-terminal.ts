export type TerminalCheckoutStatus =
  "idle" | "pending" | "successful" | "failed" | "cancelled" | "error";
export interface TerminalReader {
  id: string;
  name: string;
  status: string;
  model?: string;
}
interface StartResult {
  readerId: string;
  checkoutId: string;
  status: TerminalCheckoutStatus;
}
const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));
export async function listTerminalReaders(demoMode: boolean): Promise<TerminalReader[]> {
  if (demoMode) {
    return [
      {
        id: "demo-solo-navarra",
        name: "SumUp Solo · Av. Navarra",
        status: "paired",
        model: "virtual-solo",
      },
      {
        id: "demo-solo-carinena",
        name: "SumUp Solo · Cariñena",
        status: "paired",
        model: "virtual-solo",
      },
    ];
  }
  const response = await fetch("/api/denty/card-terminal/readers", { cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "No se pudieron cargar los datáfonos");
  return (body.items ?? []).map(
    (reader: {
      id: string;
      name: string;
      status: string;
      device?: {
        model?: string;
      };
    }) => ({
      id: reader.id,
      name: reader.name,
      status: reader.status,
      model: reader.device?.model,
    }),
  );
}
export async function startTerminalCheckout(input: {
  demoMode: boolean;
  readerId: string;
  amountCents: number;
  description: string;
}): Promise<StartResult> {
  if (input.demoMode) {
    await wait(650);
    return {
      readerId: input.readerId,
      checkoutId: `demo-${crypto.randomUUID()}`,
      status: "pending",
    };
  }
  const response = await fetch("/api/denty/card-terminal/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      readerId: input.readerId,
      amountCents: input.amountCents,
      description: input.description,
      foreignTransactionId: crypto.randomUUID(),
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "No se pudo iniciar el cobro");
  const checkoutId = body?.data?.checkout_id as string | undefined;
  if (!checkoutId) throw new Error("SumUp no devolvió checkout_id");
  return { readerId: body.readerId ?? input.readerId, checkoutId, status: "pending" };
}
export async function waitForTerminalResult(input: {
  demoMode: boolean;
  readerId: string;
  checkoutId: string;
  timeoutMs?: number;
}): Promise<TerminalCheckoutStatus> {
  if (input.demoMode) {
    await wait(1200);
    return "successful";
  }
  const deadline = Date.now() + (input.timeoutMs ?? 90000);
  while (Date.now() < deadline) {
    const response = await fetch(
      "/api/denty/card-terminal/status" +
        `?readerId=${encodeURIComponent(input.readerId)}` +
        `&checkoutId=${encodeURIComponent(input.checkoutId)}`,
      { cache: "no-store" },
    );
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "No se pudo consultar el datáfono");
    const status = body?.data?.status as TerminalCheckoutStatus | undefined;
    if (status && status !== "pending") return status;
    await wait(1500);
  }
  return "error";
}
