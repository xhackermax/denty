import { NextResponse } from "next/server";
import { requireFinanceSession } from "../_sumup";
export async function GET(request: Request) {
  try {
    await requireFinanceSession(request);
    return NextResponse.json(
      {
        error: "Usa /api/denty/payments/sumup/status?attemptId=...",
        code: "LEGACY_TERMINAL_STATUS_RETIRED",
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
