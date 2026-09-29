import { NextResponse } from "next/server";
import {
  assertPaymentAmount,
  normalizeCurrency,
  type PaymentMethod,
  type PaymentRequest,
} from "@/domain/payment-providers";
import { withoutUndefined } from "@/shared/lib/without-undefined";
import { financeRepository, resolveRequestIdentity } from "@/server/denty-supabase/route-handler";
import {
  createOrGetPaymentAttempt,
  markPaymentAttempt,
  type PaymentAttempt,
} from "@/server/payments/payment-attempts";
import { postSucceededPayment } from "@/server/payments/post-payment";
import {
  createStripeTerminalPayment,
  getStripePaymentIntent,
  mapStripePaymentIntentStatus,
} from "@/server/payments/stripe-terminal";
import {
  requireFinanceSession,
  requireSameOrigin,
  sumupConfig,
  sumupRequest,
} from "../card-terminal/_sumup";
type P =
  | "/payments/manual"
  | "/payments/sumup/checkout"
  | "/payments/sumup/status"
  | "/payments/stripe/terminal"
  | "/payments/stripe/status";
const isP = (p: string): p is P =>
  [
    "/payments/manual",
    "/payments/sumup/checkout",
    "/payments/sumup/status",
    "/payments/stripe/terminal",
    "/payments/stripe/status",
  ].includes(p);
async function ctx(request: Request) {
  const actor = await requireFinanceSession(request);
  const identity = await resolveRequestIdentity(request);
  if (!identity || identity.actor.clinicId !== actor.clinicId)
    throw new Error("No se pudo resolver la clínica activa");
  return { actor, finance: financeRepository(identity) };
}
function valid(body: Partial<PaymentRequest>, clinicId: string) {
  assertPaymentAmount(Number(body.amountCents));
  if (!body.clinicId || body.clinicId !== clinicId) throw new Error("Clínica no autorizada");
  if (!body.patientId) throw new Error("patientId obligatorio");
  if (!body.idempotencyKey?.trim()) throw new Error("idempotencyKey obligatorio");
}
async function post(a: PaymentAttempt, f: ReturnType<typeof financeRepository>) {
  return postSucceededPayment(a.id, {
    loadAttempt: (id) => f.loadPaymentAttempt(id),
    postLedger: (x) => f.postSucceededPaymentAttempt(x.id),
    linkLedger: async () => undefined,
  });
}
async function known(a: PaymentAttempt, f: ReturnType<typeof financeRepository>) {
  if (a.ledgerPaymentId) return a.ledgerPaymentId;
  if (a.providerStatus === "succeeded") return post(a, f);
  return null;
}
async function manual(request: Request) {
  const { actor, finance } = await ctx(request);
  const b = (await request.json()) as PaymentRequest & {
    method?: string;
  };
  valid(b, actor.clinicId);
  if (!b.method || !["CASH", "CARD", "TRANSFER", "FINANCING", "OTHER"].includes(b.method))
    return NextResponse.json({ error: "Método manual no válido" }, { status: 400 });
  let a = await createOrGetPaymentAttempt(
    finance.paymentAttemptStore(),
    withoutUndefined({
      clinicId: actor.clinicId,
      patientId: b.patientId,
      provider: "manual",
      amountCents: Number(b.amountCents),
      currency: b.currency,
      idempotencyKey: b.idempotencyKey!,
      budgetId: b.budgetId,
      invoiceId: b.invoiceId,
      paymentMethod: b.method as PaymentMethod,
    }),
  );
  const l = await known(a, finance);
  if (l)
    return NextResponse.json({
      provider: "manual",
      status: "COMPLETED",
      attemptId: a.id,
      ledgerPaymentId: l,
    });
  if (["failed", "cancelled", "expired"].includes(a.providerStatus))
    return NextResponse.json({ provider: "manual", status: "FAILED", attemptId: a.id });
  a = await markPaymentAttempt(finance.paymentAttemptStore(), a, "succeeded", {
    providerTransactionId: `manual:${a.id}`,
  });
  return NextResponse.json({
    provider: "manual",
    status: "COMPLETED",
    attemptId: a.id,
    ledgerPaymentId: await post(a, finance),
    providerTransactionId: a.providerTransactionId,
  });
}
async function sumupStart(request: Request) {
  const { actor, finance } = await ctx(request);
  const b = (await request.json()) as PaymentRequest & {
    readerId?: string;
  };
  valid(b, actor.clinicId);
  let a = await createOrGetPaymentAttempt(
    finance.paymentAttemptStore(),
    withoutUndefined({
      clinicId: actor.clinicId,
      patientId: b.patientId,
      provider: "sumup",
      amountCents: Number(b.amountCents),
      currency: b.currency,
      idempotencyKey: b.idempotencyKey!,
      budgetId: b.budgetId,
      invoiceId: b.invoiceId,
      paymentMethod: "CARD",
    }),
  );
  const l = await known(a, finance);
  if (l)
    return NextResponse.json({
      provider: "sumup",
      status: "COMPLETED",
      attemptId: a.id,
      ledgerPaymentId: l,
    });
  if (a.providerStatus !== "created" && a.providerCheckoutId)
    return NextResponse.json({
      provider: "sumup",
      status: "PENDING",
      attemptId: a.id,
      checkoutId: a.providerCheckoutId,
      readerId: a.readerId,
    });
  const c = sumupConfig();
  const reader = b.readerId || c.defaultReaderId;
  if (!reader)
    return NextResponse.json({ error: "No hay lector SumUp configurado" }, { status: 400 });
  const result = await sumupRequest(
    `/v0.1/merchants/${encodeURIComponent(c.merchantCode)}/readers/${encodeURIComponent(reader)}/checkout`,
    {
      method: "POST",
      body: JSON.stringify({
        total_amount: {
          currency: normalizeCurrency(b.currency),
          minor_unit: 2,
          value: Number(b.amountCents),
        },
        description: b.description?.slice(0, 120) || "Cobro Denty",
        return_url: process.env.SUMUP_RETURN_URL,
        ...(c.affiliateKey && c.appId
          ? { affiliate: { app_id: c.appId, key: c.affiliateKey, foreign_transaction_id: a.id } }
          : {}),
      }),
    },
  );
  const d = (result.data && typeof result.data === "object" ? result.data : result) as Record<
    string,
    unknown
  >;
  const checkout = String(d.checkout_id ?? d.id ?? "");
  a = await markPaymentAttempt(
    finance.paymentAttemptStore(),
    a,
    "processing",
    withoutUndefined({
      providerCheckoutId: checkout || undefined,
      providerTransactionId: checkout || undefined,
      readerId: reader,
    }),
  );
  return NextResponse.json({
    provider: "sumup",
    status: "PENDING",
    attemptId: a.id,
    checkoutId: a.providerCheckoutId,
    readerId: reader,
  });
}
async function sumupStatus(request: Request) {
  const { finance } = await ctx(request);
  const id = new URL(request.url).searchParams.get("attemptId");
  if (!id) return NextResponse.json({ error: "attemptId obligatorio" }, { status: 400 });
  let a = await finance.loadPaymentAttempt(id);
  if (a.provider !== "sumup")
    return NextResponse.json({ error: "Intento no pertenece a SumUp" }, { status: 400 });
  const l = await known(a, finance);
  if (l)
    return NextResponse.json({
      provider: "sumup",
      status: "COMPLETED",
      attemptId: id,
      ledgerPaymentId: l,
    });
  if (!a.readerId || !a.providerCheckoutId)
    return NextResponse.json({ provider: "sumup", status: "PENDING", attemptId: id });
  const c = sumupConfig();
  const result = await sumupRequest(
    `/v0.1/merchants/${encodeURIComponent(c.merchantCode)}/readers/${encodeURIComponent(a.readerId)}/checkout/${encodeURIComponent(a.providerCheckoutId)}`,
  );
  const d = (result.data && typeof result.data === "object" ? result.data : result) as Record<
    string,
    unknown
  >;
  const raw = String(d.status ?? "").toLowerCase();
  if (["successful", "succeeded", "completed"].includes(raw)) {
    a = await markPaymentAttempt(finance.paymentAttemptStore(), a, "succeeded");
    return NextResponse.json({
      provider: "sumup",
      status: "COMPLETED",
      attemptId: id,
      ledgerPaymentId: await post(a, finance),
    });
  }
  if (["failed", "cancelled", "canceled"].includes(raw)) {
    await markPaymentAttempt(
      finance.paymentAttemptStore(),
      a,
      raw.startsWith("cancel") ? "cancelled" : "failed",
    );
    return NextResponse.json({
      provider: "sumup",
      status: raw.startsWith("cancel") ? "CANCELLED" : "FAILED",
      attemptId: id,
    });
  }
  return NextResponse.json({ provider: "sumup", status: "PENDING", attemptId: id });
}
async function stripeStart(request: Request) {
  const { actor, finance } = await ctx(request);
  const b = (await request.json()) as PaymentRequest & {
    readerId?: string;
  };
  valid(b, actor.clinicId);
  if (!b.readerId) return NextResponse.json({ error: "readerId obligatorio" }, { status: 400 });
  let a = await createOrGetPaymentAttempt(
    finance.paymentAttemptStore(),
    withoutUndefined({
      clinicId: actor.clinicId,
      patientId: b.patientId,
      provider: "stripe",
      amountCents: Number(b.amountCents),
      currency: b.currency,
      idempotencyKey: b.idempotencyKey!,
      budgetId: b.budgetId,
      invoiceId: b.invoiceId,
      paymentMethod: "CARD",
    }),
  );
  const l = await known(a, finance);
  if (l)
    return NextResponse.json({
      provider: "stripe",
      status: "COMPLETED",
      attemptId: a.id,
      ledgerPaymentId: l,
      paymentIntentId: a.providerTransactionId,
    });
  if (a.providerStatus !== "created" && a.providerTransactionId)
    return NextResponse.json({
      provider: "stripe",
      status: "PENDING",
      attemptId: a.id,
      paymentIntentId: a.providerTransactionId,
      readerId: a.readerId,
    });
  const r = await createStripeTerminalPayment(
    {
      ...b,
      amountCents: Number(b.amountCents),
      currency: normalizeCurrency(b.currency),
      idempotencyKey: a.id,
    },
    b.readerId,
    process.env.STRIPE_CONNECTED_ACCOUNT_ID ?? process.env.STRIPE_DEFAULT_CONNECTED_ACCOUNT_ID,
  );
  a = await markPaymentAttempt(
    finance.paymentAttemptStore(),
    a,
    "processing",
    withoutUndefined({
      providerTransactionId: r.paymentIntentId ?? r.providerTransactionId,
      readerId: r.readerId ?? b.readerId,
    }),
  );
  return NextResponse.json({ ...r, attemptId: a.id });
}
async function stripeStatus(request: Request) {
  const { finance } = await ctx(request);
  const id = new URL(request.url).searchParams.get("attemptId");
  if (!id) return NextResponse.json({ error: "attemptId obligatorio" }, { status: 400 });
  let a = await finance.loadPaymentAttempt(id);
  if (a.provider !== "stripe")
    return NextResponse.json({ error: "Intento no pertenece a Stripe" }, { status: 400 });
  const l = await known(a, finance);
  if (l)
    return NextResponse.json({
      provider: "stripe",
      status: "COMPLETED",
      attemptId: id,
      ledgerPaymentId: l,
      paymentIntentId: a.providerTransactionId,
    });
  if (!a.providerTransactionId)
    return NextResponse.json({ provider: "stripe", status: "PENDING", attemptId: id });
  const intent = await getStripePaymentIntent(
    a.providerTransactionId,
    process.env.STRIPE_CONNECTED_ACCOUNT_ID ?? process.env.STRIPE_DEFAULT_CONNECTED_ACCOUNT_ID,
  );
  const st = mapStripePaymentIntentStatus(intent);
  if (st === "COMPLETED") {
    a = await markPaymentAttempt(finance.paymentAttemptStore(), a, "succeeded");
    return NextResponse.json({
      provider: "stripe",
      status: st,
      attemptId: id,
      ledgerPaymentId: await post(a, finance),
      paymentIntentId: intent.id,
    });
  }
  if (st === "FAILED" || st === "CANCELLED")
    await markPaymentAttempt(
      finance.paymentAttemptStore(),
      a,
      st === "FAILED" ? "failed" : "cancelled",
    );
  return NextResponse.json({
    provider: "stripe",
    status: st,
    attemptId: id,
    paymentIntentId: intent.id,
  });
}
export async function maybeHandlePaymentProviderRequest(
  request: Request,
  path: string,
): Promise<Response | null> {
  if (!isP(path)) return null;
  try {
    requireSameOrigin(request);
    if (request.method === "POST" && path === "/payments/manual") return manual(request);
    if (request.method === "POST" && path === "/payments/sumup/checkout")
      return sumupStart(request);
    if (request.method === "GET" && path === "/payments/sumup/status") return sumupStatus(request);
    if (request.method === "POST" && path === "/payments/stripe/terminal")
      return stripeStart(request);
    if (request.method === "GET" && path === "/payments/stripe/status")
      return stripeStatus(request);
    return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo procesar el pago" },
      { status: 502 },
    );
  }
}
