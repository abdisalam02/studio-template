import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  clearedAdminSessionCookieOptions,
  revokeAdminSession,
} from "@/lib/adminAuth";

export const dynamic = "force-dynamic"; // design-ok

/** Revokes the server-side session and clears the cookie. */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  if (token) await revokeAdminSession(token);

  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, "", clearedAdminSessionCookieOptions());
  return res;
}

