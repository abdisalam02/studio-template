import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createAdminSessionToken } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || "niwache12@gmail.com";

    // Issue signed admin session token directly
    const sessionToken = createAdminSessionToken(email, "gangina");

    return NextResponse.json({
      success: true,
      email,
      token: sessionToken,
    });
  } catch (err: unknown) {
    console.error("Dev login error:", err);
    return NextResponse.json({
      success: true,
      email: "niwache12@gmail.com",
      token: "dev-bypass-bml3YWNoZTEyQGdtYWlsLmNvbQ==",
      mock: true,
    });
  }
}
