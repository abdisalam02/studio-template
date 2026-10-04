import { NextRequest, NextResponse } from "next/server";
import { generate6DigitOtp, createOtpChallenge } from "@/lib/otpStore";
import { sendOwnerOtpEmail } from "@/lib/email";
import {
  getTenantConfig,
  findTenantByAdminEmail,
  DEFAULT_TENANT_SLUG,
} from "@/config/tenant.config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const requestedTenantRaw = body.tenant_id ?? body.tenantId ?? "";
    const requestedTenantId = String(requestedTenantRaw || DEFAULT_TENANT_SLUG);
    const requestedEmail =
      typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

    // Resolve the tenant dynamically from the request (falls back to default).
    let config = getTenantConfig(requestedTenantId);

    // Smart auto-detection: when the requested tenant (or the implicit default)
    // does not authorize the supplied email, adopt the tenant that does. This
    // lets an owner sign in from /admin.html without ?tenant=studio-klo.
    const allowedForRequested = config.auth.allowedAdminEmails
      .map((entry) => entry.toLowerCase().trim())
      .filter(Boolean);
    const isDefaultRequest =
      !requestedTenantRaw || requestedTenantId === DEFAULT_TENANT_SLUG;

    if (requestedEmail && !allowedForRequested.includes(requestedEmail)) {
      const matched = findTenantByAdminEmail(requestedEmail);
      if (matched && (isDefaultRequest || matched.id !== config.id)) {
        config = matched;
      }
    }

    const allowedEmails = config.auth.allowedAdminEmails
      .map((entry) => entry.toLowerCase().trim())
      .filter(Boolean);

    const targetEmail =
      requestedEmail || (config.contact.ownerEmail || "").toLowerCase().trim();

    // The requested (or default owner) email must be explicitly authorized.
    if (!targetEmail || !targetEmail.includes("@") || !allowedEmails.includes(targetEmail)) {
      return NextResponse.json(
        {
          error: "forbidden",
          message: "This email is not authorized for this studio.",
        },
        { status: 403 }
      );
    }

    const code = generate6DigitOtp();
    const { challengeToken, expiresAt } = createOtpChallenge(targetEmail, code);

    // Dispatch OTP via Resend, branded for the resolved tenant.
    await sendOwnerOtpEmail(targetEmail, code, config.id);

    return NextResponse.json({
      success: true,
      email: targetEmail,
      tenant_id: config.id,
      challengeToken,
      expiresAt,
    });
  } catch (err: unknown) {
    console.error("Error in send-otp:", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not send the one-time code." },
      { status: 500 }
    );
  }
}
