import { NextRequest, NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/otpStore";
import { createAdminSessionToken } from "@/lib/adminAuth";
import { getTenantConfig, DEFAULT_TENANT_SLUG } from "@/config/tenant.config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, code, challengeToken, tenant_id, tenantId } = body;

    // Resolve the active tenant and its authorized admin allow-list.
    const resolvedTenantId = String(tenant_id || tenantId || DEFAULT_TENANT_SLUG);
    const config = getTenantConfig(resolvedTenantId);
    const allowedEmails = config.auth.allowedAdminEmails
      .map((entry) => entry.toLowerCase().trim())
      .filter(Boolean);

    const defaultEmail = (config.contact.ownerEmail || allowedEmails[0] || "")
      .toLowerCase()
      .trim();
    const targetEmail = String(email || defaultEmail).toLowerCase().trim();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // Only emails explicitly authorized for this studio may ever receive a session.
    if (!targetEmail || !targetEmail.includes("@") || !allowedEmails.includes(targetEmail)) {
      return NextResponse.json(
        { error: "forbidden", message: "This email is not authorized for this studio." },
        { status: 401 }
      );
    }

    // Genuine test-environment mock: an operator may opt in to a fixed code for
    // automated/local testing via ADMIN_TEST_OTP. Never available in production.
    const testOtp = process.env.ADMIN_TEST_OTP;
    const isTestEnvironmentMock =
      process.env.NODE_ENV !== "production" && Boolean(testOtp) && code === testOtp;

    // Standard verification against the issued OTP store / signed challenge.
    const isValid = isTestEnvironmentMock || verifyOtpCode(targetEmail, code, challengeToken);
    if (!isValid) {
      return NextResponse.json(
        { error: "invalid_code", message: "Invalid or expired code." },
        { status: 401 }
      );
    }

    const adminToken = createAdminSessionToken(targetEmail, config.id);
    const res = NextResponse.json({ success: true, token: adminToken });
    res.cookies.set("admin_token", adminToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
