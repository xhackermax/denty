import { NextResponse } from "next/server";
import { assertPaymentAmount, normalizeCurrency, type PaymentRequest } from "@/domain/payment-providers";
import { requireFinanceSession, requireSameOrigin } from "../../../card-terminal/_sumup";
import { createStripeTerminalPayment } from "@/server/payments/stripe-terminal";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const actor = await requireFinanceSession(request);
    const body = (await request.json()) as PaymentRequest & { readerId?: string };
    assertPaymentAmount(Number(body.amountCents));
    if (body.clinicId && body.clinicId !== actor.clinicId) return NextResponse.json({ error: "Clínica no autorizada" }, { status: 403 });
    if (!body.clinicId || !body.patientId || !body.readerId) return NextResponse.json({ error: "clinicId, patientId y readerId son obligatorios" }, { status: 400 });
    const result = await createStripeTerminalPayment({ ...body, amountCents: Number(body.amountCents), currency: normalizeCurrency(body.currency) }, body.readerId, process.env.STRIPE_CONNECTED_ACCOUNT_ID);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo iniciar el cobro Stripe" }, { status: 502 });
  }
}
