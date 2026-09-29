import { NextResponse } from "next/server";
import { requireFinanceSession, requireSameOrigin } from "../_sumup";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await requireFinanceSession(request);
    return NextResponse.json(
      {
        error: "Usa /api/denty/payments/sumup/checkout con patientId e idempotencyKey.",
        code: "LEGACY_TERMINAL_CHECKOUT_RETIRED",
      },
      { status: 410 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No autorizado" },
      { status: 403 },
    );
  }
}
