import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || "niwache12@gmail.com";

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    // Generate link/token for the dev email without sending an SMTP email
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (error || !data?.properties?.action_link) {
      // Fallback: create mock token if auth user generation is restricted
      return NextResponse.json({
        success: true,
        email,
        token: `dev-bypass-${Buffer.from(email).toString("base64")}`,
        mock: true,
      });
    }

    return NextResponse.json({
      success: true,
      email,
      action_link: data.properties.action_link,
      hashed_token: data.properties.hashed_token,
      token: data.properties.hashed_token || `dev-bypass-${Buffer.from(email).toString("base64")}`,
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
