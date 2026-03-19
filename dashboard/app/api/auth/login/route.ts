import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-constants";
import { createAuthSessionToken } from "@/lib/auth-session";
import { getDashboardApiSecret } from "@/lib/dashboard-secret";

export async function POST(request: Request) {
  const secret = getDashboardApiSecret();
  if (!secret) {
    return NextResponse.json({
      ok: true,
      auth_required: false,
      message: "No DASHBOARD_API_SECRET or ORCHESTRATION_ENQUEUE_SECRET; APIs are open.",
    });
  }

  const body = await request.json().catch(() => ({}));
  const provided =
    typeof body.secret === "string" ? body.secret.trim() : "";
  if (provided !== secret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const token = createAuthSessionToken(secret);
  const res = NextResponse.json({ ok: true, auth_required: true });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
