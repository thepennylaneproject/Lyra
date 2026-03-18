import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function auditDir(): string {
  const raw = process.env.LYRA_AUDIT_DIR || "../audits";
  return path.resolve(process.cwd(), raw);
}

export async function GET() {
  const configPath = path.join(auditDir(), "routing_config.json");
  if (!fs.existsSync(configPath)) {
    return NextResponse.json({ routes: {}, rules: {} });
  }
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(raw);
    // Strip internal comment keys before sending to client
    const { _comment: _, _doc: __, ...clean } = config;
    return NextResponse.json(clean);
  } catch {
    return NextResponse.json({ routes: {}, rules: {} });
  }
}
