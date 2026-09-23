import { NextResponse } from "next/server";
import {
  requireFinanceSession,
  sumupConfig,
  sumupRequest,
  terminalErrorStatus,
  type SumUpReader,
} from "../_sumup";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireFinanceSession(request);
    const { merchantCode, defaultReaderId } = sumupConfig();
    const result = await sumupRequest(
      `/v0.1/merchants/${encodeURIComponent(merchantCode)}/readers`,
    );
    const readers = Array.isArray(result.items) ? (result.items as SumUpReader[]) : [];
    return NextResponse.json({
      items: readers.filter((reader) => reader.status === "paired"),
      defaultReaderId: defaultReaderId ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudieron cargar los datáfonos",
      },
      { status: terminalErrorStatus(error, 503) },
    );
  }
}
