export type TerminalCheckoutStatus = "idle" | "pending" | "successful" | "failed" | "cancelled" | "error";
export interface TerminalReader { id: string; name: string; status: string; model?: string; }
interface StartResult { readerId: string; checkoutId: string; status: TerminalCheckoutStatus; }
const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export async function listTerminalReaders(): Promise<TerminalReader[]> {
  const response = await fetch("/api/denty/card-terminal/readers", { cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "No se pudieron cargar los datáfonos");
  return (body.items ?? []).map((reader: { id: string; name: string; status: string; device?: { model?: string } }) => ({ id: reader.id, name: reader.name, status: reader.status, model: reader.device?.model }));
}

export async function startTerminalCheckout(input: { readerId: string; amountCents: number; description: string }): Promise<StartResult> {
  const response = await fetch("/api/denty/card-terminal/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, foreignTransactionId: crypto.randomUUID() }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "No se pudo iniciar el cobro");
  const checkoutId = body?.data?.checkout_id as string | undefined;
  if (!checkoutId) throw new Error("SumUp no devolvió checkout_id");
  return { readerId: body.readerId ?? input.readerId, checkoutId, status: "pending" };
}

export async function waitForTerminalResult(input: { readerId: string; checkoutId: string; timeoutMs?: number }): Promise<TerminalCheckoutStatus> {
  const deadline = Date.now() + (input.timeoutMs ?? 90000);
  while (Date.now() < deadline) {
    const response = await fetch(`/api/denty/card-terminal/status?readerId=${encodeURIComponent(input.readerId)}&checkoutId=${encodeURIComponent(input.checkoutId)}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "No se pudo consultar el datáfono");
    const status = body?.data?.status as TerminalCheckoutStatus | undefined;
    if (status && status !== "pending") return status;
    await wait(1500);
  }
  return "error";
}

export type ProviderPaymentStatus = "created"|"processing"|"requires_action"|"succeeded"|"failed"|"cancelled"|"expired";
export interface ProviderPaymentStart { provider:"manual"|"sumup"|"stripe"; status:ProviderPaymentStatus; providerTransactionId?:string; checkoutId?:string; paymentIntentId?:string; readerId?:string; }
export async function startProviderPayment(input:{provider:"manual"|"sumup"|"stripe";clinicId:string;patientId:string;amountCents:number;currency?:string;description?:string;readerId?:string;method?:string;idempotencyKey:string}):Promise<ProviderPaymentStart>{
  const path=input.provider==="manual"?"/api/denty/payments/manual":input.provider==="sumup"?"/api/denty/payments/sumup/checkout":"/api/denty/payments/stripe/terminal";
  const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
  const body=await response.json(); if(!response.ok) throw new Error(body.error??"No se pudo iniciar el cobro");
  const legacy=body.status as string; const status:ProviderPaymentStatus=legacy==="COMPLETED"?"succeeded":legacy==="FAILED"?"failed":legacy==="CANCELLED"?"cancelled":"processing";
  return {...body,status};
}
export async function waitForProviderPayment(input:{provider:"sumup"|"stripe";readerId?:string;checkoutId?:string;paymentIntentId?:string;timeoutMs?:number}):Promise<ProviderPaymentStatus>{
  const deadline=Date.now()+(input.timeoutMs??90000);
  while(Date.now()<deadline){
    const path=input.provider==="stripe"?`/api/denty/payments/stripe/status?paymentIntentId=${encodeURIComponent(input.paymentIntentId??"")}`:`/api/denty/card-terminal/status?readerId=${encodeURIComponent(input.readerId??"")}&checkoutId=${encodeURIComponent(input.checkoutId??"")}`;
    const response=await fetch(path,{cache:"no-store"}); const body=await response.json(); if(!response.ok) throw new Error(body.error??"No se pudo consultar el cobro");
    const raw=body.status??body?.data?.status; if(raw==="COMPLETED"||raw==="successful"||raw==="succeeded") return "succeeded"; if(raw==="FAILED"||raw==="failed") return "failed"; if(raw==="CANCELLED"||raw==="cancelled") return "cancelled";
    await wait(1500);
  }
  return "expired";
}
