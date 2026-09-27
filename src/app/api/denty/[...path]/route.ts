import { NextResponse } from "next/server";

import { assertPaymentAmount, normalizeCurrency, type PaymentRequest } from "@/domain/money";
import { handleDentyApiRequest, type DentyRouteContext } from "@/server/denty-api/request-handler";
import {
  createStripeTerminalPayment,
  getStripePaymentIntent,
  mapStripePaymentIntentStatus,
  requireFinanceSession,
  requireSameOrigin,
  sumupConfig,
  sumupRequest,
} from "../card-terminal/_sumup";

function isPaymentProviderPath(path: string): boolean {
  return path === "/payments/manual" ||
    path === "/payments/sumup/checkout" ||
    path === "/payments/stripe/terminal" ||
    path === "/payments/stripe/status";
}

function forbiddenClinic(bodyClinicId: string | undefined, actorClinicId: string) {
  return bodyClinicId && bodyClinicId !== actorClinicId;
}

async function handlePaymentProviderRequest(request: Request, routePath: string): Promise<Response | null> {
  if (!isPaymentProviderPath(routePath)) return null;
  try {
    requireSameOrigin(request);
    if (request.method === "POST" && routePath === "/payments/manual") {
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
    if (request.method === "POST" && routePath === "/payments/sumup/checkout") {
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
    if (request.method === "POST" && routePath === "/payments/stripe/terminal") {
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
    if (request.method === "GET" && routePath === "/payments/stripe/status") {
      await requireFinanceSession(request);
      const url = new URL(request.url);
      const paymentIntentId = url.searchParams.get("paymentIntentId");
      if (!paymentIntentId) return NextResponse.json({ error: "paymentIntentId obligatorio" }, { status: 400 });
      const intent = await getStripePaymentIntent(paymentIntentId, process.env.STRIPE_CONNECTED_ACCOUNT_ID);
      const status = mapStripePaymentIntentStatus(intent);
      return NextResponse.json({ provider: "stripe", status, paymentIntentId: intent.id, amountCents: intent.amount, currency: intent.currency });
    }
    return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo procesar el pago" }, { status: 502 });
  }
}

async function proxyRequest(request: Request, context: DentyRouteContext): Promise<Response> {
  const { path } = await context.params;
  const routePath = `/${path.join("/")}`;
  const paymentResponse = await handlePaymentProviderRequest(request, routePath);
  if (paymentResponse) return paymentResponse;
  return handleDentyApiRequest(request, routePath);
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
