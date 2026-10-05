import { NextRequest, NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/otpStore";
import { createAdminSessionToken } from "@/lib/adminAuth";
import { SlidingWindowRateLimiter } from "@/lib/rateLimit";
import { getTenantConfig, DEFAULT_TENANT_SLUG } from "@/config/tenant.config";

export const dynamic = "force-dynamic"; // design-ok

/**
 * Failed verification throttling: at most 5 failed attempts per email inside a
 * rolling 15-minute window. Success clears the counter. Both "invalid code"
 * and "email not authorized" attempts count, which also slows enumeration.
 */
const FAILED_WINDOW_MS = 15 * 60 * 1000;
const FAILED_MAX_ATTEMPTS = 5;

const failedAttempts = new SlidingWindowRateLimiter(
  FAILED_MAX_ATTEMPTS,
  FAILED_WINDOW_MS
);

function rateLimitedResponse(retryAfterMs: number): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return NextResponse.json(
    {
      error: "rate_limited",
      message: "Too many failed verification attempts. Please try again later.",
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { code, challengeToken, tenant_id, tenantId } = body;

    // Resolve the active tenant and its authorized admin allow-list.
    const resolvedTenantId = String(tenant_id || tenantId || DEFAULT_TENANT_SLUG);
    const config = getTenantConfig(resolvedTenantId);
    const allowedEmails = config.auth.allowedAdminEmails
      .map((entry) => entry.toLowerCase().trim())
      .filter(Boolean);

    const defaultEmail = (config.contact.ownerEmail || allowedEmails[0] || "")
      .toLowerCase()
      .trim();
    const requestedEmail =
      typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const targetEmail = requestedEmail || defaultEmail;

    // Locked-out email? Reject before any verification work.
    if (targetEmail && failedAttempts.isLimited(targetEmail)) {
      return rateLimitedResponse(failedAttempts.retryAfterMs(targetEmail));
    }

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const recordFailure = () => {
      if (targetEmail) failedAttempts.record(targetEmail);
    };

    // Only emails explicitly authorized for this studio may ever receive a session.
    if (!targetEmail || !targetEmail.includes("@") || !allowedEmails.includes(targetEmail)) {
      recordFailure();
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
      recordFailure();
      return NextResponse.json(
        { error: "invalid_code", message: "Invalid or expired code." },
        { status: 401 }
      );
    }

    // A successful verification clears the failure budget for this email.
    failedAttempts.reset(targetEmail);

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
    console.error("Error in verify-otp:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
