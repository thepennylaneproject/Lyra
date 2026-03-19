import { NextResponse } from "next/server";
import { fetchDurableState, getDurableStateConfig } from "@/lib/durable-state";
import { apiErrorMessage } from "@/lib/api-error";

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
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}
