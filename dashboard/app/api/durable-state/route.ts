import { NextResponse } from "next/server";
import { fetchDurableState, getDurableStateConfig } from "@/lib/durable-state";

export async function GET() {
  // #region agent log
  fetch("http://127.0.0.1:7282/ingest/b02da152-e83c-445f-a22d-32676413b958", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "102243" },
    body: JSON.stringify({
      sessionId: "102243",
      location: "dashboard/app/api/durable-state/route.ts:GET",
      message: "GET /api/durable-state entered",
      data: {},
      timestamp: Date.now(),
      hypothesisId: "H4",
    }),
  }).catch(() => {});
  // #endregion
  try {
    const [config, state] = await Promise.all([
      Promise.resolve(getDurableStateConfig()),
      fetchDurableState(8),
    ]);

    return NextResponse.json({ config, state });
  } catch (e) {
    console.error("GET /api/durable-state", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
