import { NextResponse } from "next/server";
import {
  requireFinanceSession,
  requireSameOrigin,
  sumupConfig,
  sumupRequest,
  terminalErrorStatus,
} from "../_sumup";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await requireFinanceSession(request);
    const body = (await request.json()) as {
      readerId?: string;
      amountCents?: number;
      description?: string;
      foreignTransactionId?: string;
    };
    const amountCents = Math.round(Number(body.amountCents ?? 0));
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: "Importe no válido" }, { status: 400 });
    }
    const config = sumupConfig();
    const readerId = body.readerId || config.defaultReaderId;
    if (!readerId)
      return NextResponse.json(
        { error: "No hay lector SumUp Solo seleccionado" },
        {
          status: 400,
        },
      );
    const affiliate =
      config.affiliateKey && config.appId
        ? {
            app_id: config.appId,
            key: config.affiliateKey,
            foreign_transaction_id: body.foreignTransactionId ?? crypto.randomUUID(),
          }
        : undefined;
    const result = await sumupRequest(
      `/v0.1/merchants/${encodeURIComponent(config.merchantCode)}` +
        `/readers/${encodeURIComponent(readerId)}/checkout`,
      {
        method: "POST",
        body: JSON.stringify({
          total_amount: { currency: "EUR", minor_unit: 2, value: amountCents },
          description: body.description?.slice(0, 120) || "Cobro Denty",
          ...(affiliate ? { affiliate } : {}),
        }),
      },
    );
    return NextResponse.json({ readerId, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo iniciar el cobro" },
      { status: terminalErrorStatus(error, 502) },
    );
  }
}
