import { NextResponse } from "next/server";
import { fetchDurableState, getDurableStateConfig } from "@/lib/durable-state";

export async function GET() {
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
