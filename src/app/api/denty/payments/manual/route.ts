import { NextResponse } from "next/server";
import { assertPaymentAmount, type PaymentRequest } from "@/domain/payment-providers";
import { requireFinanceSession, requireSameOrigin } from "../../card-terminal/_sumup";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const actor = await requireFinanceSession(request);
    const body = (await request.json()) as Partial<PaymentRequest> & { method?: string };
    assertPaymentAmount(Number(body.amountCents));
    if (body.clinicId && body.clinicId !== actor.clinicId) return NextResponse.json({ error: "Clínica no autorizada" }, { status: 403 });
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
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo registrar el pago" }, { status: 400 });
  }
}
