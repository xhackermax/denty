import { NextResponse } from "next/server";

import { assertPaymentAmount, normalizeCurrency, type PaymentRequest } from "@/domain/payment-providers";
import { createStripeTerminalPayment, getStripePaymentIntent, mapStripePaymentIntentStatus } from "@/server/payments/stripe-terminal";

import { requireFinanceSession, requireSameOrigin, sumupConfig, sumupRequest } from "../card-terminal/_sumup";

type PaymentPath =
  | "/payments/manual"
  | "/payments/sumup/checkout"
  | "/payments/stripe/terminal"
  | "/payments/stripe/status";

function isPaymentPath(path: string): path is PaymentPath {
  return path === "/payments/manual" ||
    path === "/payments/sumup/checkout" ||
    path === "/payments/stripe/terminal" ||
    path === "/payments/stripe/status";
}

function forbiddenClinic(bodyClinicId: string | undefined, actorClinicId: string) {
  return bodyClinicId && bodyClinicId !== actorClinicId;
}

async function handleManualPayment(request: Request) {
  const actor = await requireFinanceSession(request);
  const body = (await request.json()) as Partial<PaymentRequest> & { method?: string };
  assertPaymentAmount(Number(body.amountCents));
  if (forbiddenClinic(body.clinicId, actor.clinicId)) return NextResponse.json({ error: "Clínica no autorizada" }, { status: 403 });
  if (!body.clinicId || !body.patientId) return NextResponse.json({ error: "clinicId y patientId son obligatorios" }, { status: 400 });
  if (!body.method || !["CASH", "CARD", "TRANSFER", "FINANCING", "OTHER"].includes(body.method)) {
    return NextResponse.json({ error: "Método manual no válido" }, { status: 400 });
  }
  return NextResponse.json({
    provider: "manual",
    status: "COMPLETED",
    method: body.method,
    amountCents: Number(body.amountCents),
    clinicId: body.clinicId,
    patientId: body.patientId,
    providerTransactionId: null,
  });
}

async function handleSumupCheckout(request: Request) {
  const actor = await requireFinanceSession(request);
  const body = (await request.json()) as PaymentRequest & { readerId?: string };
  assertPaymentAmount(Number(body.amountCents));
  if (forbiddenClinic(body.clinicId, actor.clinicId)) return NextResponse.json({ error: "Clínica no autorizada" }, { status: 403 });
  if (!body.clinicId || !body.patientId) return NextResponse.json({ error: "clinicId y patientId son obligatorios" }, { status: 400 });
  const config = sumupConfig();
  const readerId = body.readerId || config.defaultReaderId;
  if (!readerId) return NextResponse.json({ error: "No hay lector SumUp configurado" }, { status: 400 });
  const foreignTransactionId = body.idempotencyKey ?? crypto.randomUUID();
  const result = await sumupRequest(`/v0.1/merchants/${encodeURIComponent(config.merchantCode)}/readers/${encodeURIComponent(readerId)}/checkout`, {
    method: "POST",
    body: JSON.stringify({
      total_amount: { currency: body.currency ?? "EUR", minor_unit: 2, value: Number(body.amountCents) },
      description: body.description?.slice(0, 120) || "Cobro Denty",
      return_url: process.env.SUMUP_RETURN_URL,
      ...(config.affiliateKey && config.appId ? { affiliate: { app_id: config.appId, key: config.affiliateKey, foreign_transaction_id: foreignTransactionId } } : {}),
    }),
  });
  return NextResponse.json({ provider: "sumup", status: "PENDING", readerId, ...result });
}

async function handleStripeTerminal(request: Request) {
  const actor = await requireFinanceSession(request);
  const body = (await request.json()) as PaymentRequest & { readerId?: string };
  assertPaymentAmount(Number(body.amountCents));
  if (forbiddenClinic(body.clinicId, actor.clinicId)) return NextResponse.json({ error: "Clínica no autorizada" }, { status: 403 });
  if (!body.clinicId || !body.patientId || !body.readerId) {
    return NextResponse.json({ error: "clinicId, patientId y readerId son obligatorios" }, { status: 400 });
  }
  const result = await createStripeTerminalPayment({ ...body, amountCents: Number(body.amountCents), currency: normalizeCurrency(body.currency) }, body.readerId, process.env.STRIPE_CONNECTED_ACCOUNT_ID);
  return NextResponse.json(result);
}

async function handleStripeStatus(request: Request) {
  await requireFinanceSession(request);
  const url = new URL(request.url);
  const paymentIntentId = url.searchParams.get("paymentIntentId");
  if (!paymentIntentId) return NextResponse.json({ error: "paymentIntentId obligatorio" }, { status: 400 });
  const intent = await getStripePaymentIntent(paymentIntentId, process.env.STRIPE_CONNECTED_ACCOUNT_ID);
  const status = mapStripePaymentIntentStatus(intent);
  return NextResponse.json({ provider: "stripe", status, paymentIntentId: intent.id, amountCents: intent.amount, currency: intent.currency });
}

export async function maybeHandlePaymentProviderRequest(request: Request, path: string): Promise<Response | null> {
  if (!isPaymentPath(path)) return null;
  try {
    requireSameOrigin(request);
    if (request.method === "POST" && path === "/payments/manual") return handleManualPayment(request);
    if (request.method === "POST" && path === "/payments/sumup/checkout") return handleSumupCheckout(request);
    if (request.method === "POST" && path === "/payments/stripe/terminal") return handleStripeTerminal(request);
    if (request.method === "GET" && path === "/payments/stripe/status") return handleStripeStatus(request);
    return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo procesar el pago" }, { status: 502 });
  }
}
