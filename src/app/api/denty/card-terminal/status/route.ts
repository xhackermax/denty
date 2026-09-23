import { NextResponse } from "next/server";
import { requireFinanceSession, sumupConfig, sumupRequest, terminalErrorStatus } from "../_sumup";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireFinanceSession(request);
    const url = new URL(request.url);
    const readerId = url.searchParams.get("readerId");
    const checkoutId = url.searchParams.get("checkoutId");
    if (!readerId || !checkoutId)
      return NextResponse.json({ error: "Faltan readerId o checkoutId" }, { status: 400 });
    const { merchantCode } = sumupConfig();
    const result = await sumupRequest(
      `/v0.1/merchants/${encodeURIComponent(merchantCode)}` +
        `/readers/${encodeURIComponent(readerId)}` +
        `/checkout/${encodeURIComponent(checkoutId)}`,
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo consultar el cobro" },
      { status: terminalErrorStatus(error, 502) },
    );
  }
}
