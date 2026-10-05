import { NextRequest, NextResponse } from "next/server";
import { generate6DigitOtp, createOtpChallenge } from "@/lib/otpStore";
import { sendOwnerOtpEmail } from "@/lib/email";
import { SlidingWindowRateLimiter, getClientIp } from "@/lib/rateLimit";
import {
  getTenantConfig,
  findTenantByAdminEmail,
  DEFAULT_TENANT_SLUG,
} from "@/config/tenant.config";

export const dynamic = "force-dynamic"; // design-ok

/**
 * OTP request throttling: at most 3 codes per 10 minutes, enforced both per
 * client IP and per target email. This blunts OTP-spam / email-bombing and
 * slow enumeration of authorized addresses.
 */
const OTP_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX_REQUESTS = 3;

const perIpLimiter = new SlidingWindowRateLimiter(OTP_MAX_REQUESTS, OTP_WINDOW_MS);
const perEmailLimiter = new SlidingWindowRateLimiter(OTP_MAX_REQUESTS, OTP_WINDOW_MS);

function rateLimitedResponse(retryAfterMs: number): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return NextResponse.json(
    {
      error: "rate_limited",
      message: "Too many verification codes requested. Please try again later.",
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);

    // Reject abusive sources before doing any tenant / email work.
    if (perIpLimiter.isLimited(clientIp)) {
      return rateLimitedResponse(perIpLimiter.retryAfterMs(clientIp));
    }

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

    // Per-email throttle applies to the resolved destination only.
    if (targetEmail && perEmailLimiter.isLimited(targetEmail)) {
      return rateLimitedResponse(perEmailLimiter.retryAfterMs(targetEmail));
    }

    // The requested (or default owner) email must be explicitly authorized.
    if (!targetEmail || !targetEmail.includes("@") || !allowedEmails.includes(targetEmail)) {
      perIpLimiter.record(clientIp);
      return NextResponse.json(
        {
          error: "forbidden",
          message: "This email is not authorized for this studio.",
        },
        { status: 403 }
      );
    }

    // Count this accepted request against both budgets.
    perIpLimiter.record(clientIp);
    perEmailLimiter.record(targetEmail);

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
