import { NextResponse } from "next/server";
import { buildRoutingConfig, readFileRoutingConfig } from "@/lib/routing-config";

export async function GET() {
  try {
    const fileConfig = readFileRoutingConfig();
    return NextResponse.json(buildRoutingConfig(fileConfig ?? undefined));
  } catch (e) {
    console.error("GET /api/engine/routing", e);
    return NextResponse.json(buildRoutingConfig(), { status: 200 });
  }
}
