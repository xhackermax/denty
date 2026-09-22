import { NextResponse } from "next/server";

import { APP_VERSION } from "@/shared/lib/app-meta";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "denty-web",
    version: APP_VERSION,
  });
}
