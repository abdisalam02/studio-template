import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createOtpChallenge } from "@/lib/otpStore";
import { sendOwnerOtpEmail } from "@/lib/email";
import { consumeRateLimit, getClientIp, hashIp } from "@/lib/rateLimit";
import { resolveTenantForEmail, isTenantAdmin } from "@/lib/tenantAuth";
import { getTenantConfig, DEFAULT_TENANT_SLUG } from "@/config/tenant.config";

export const dynamic = "force-dynamic";

/**
 * Requests a login code.
 *
 * Responses are deliberately uniform: an unauthorised address receives the
 * same 200 shape as a valid one (with a dummy challenge id), so the endpoint
 * cannot be used to enumerate studio admins. Rate limits are persisted, not
 * per serverless instance.
 */
const WINDOW_SECONDS = 10 * 60;
const IP_LIMIT = 10;
const EMAIL_LIMIT = 3;
const OTP_TTL_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);
    const ipAllowed = await consumeRateLimit(
      `otp:ip:${hashIp(clientIp)}`,
      IP_LIMIT,
      WINDOW_SECONDS
    );

    if (!ipAllowed) {
      return NextResponse.json(
        { error: "rate_limited", message: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "600" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const requestedEmail =
      typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const requestedTenant = String(body.tenant_id ?? body.tenantId ?? DEFAULT_TENANT_SLUG);

    const requestedTenantId = getTenantConfig(requestedTenant).id;
    const requestedAllowed = await isTenantAdmin(requestedEmail, requestedTenantId);
    const resolvedTenant = await resolveTenantForEmail(requestedEmail);
    const tenantId = requestedAllowed ? requestedTenantId : (resolvedTenant || requestedTenantId);
    const config = getTenantConfig(tenantId);
    const targetEmail =
      requestedEmail || (config.contact.ownerEmail || "").toLowerCase().trim();

    const authorized = Boolean(targetEmail) && (await resolveTenantForEmail(targetEmail)) !== null;
    const expiresAt = Date.now() + OTP_TTL_MS;
    const dummyChallengeId = crypto.randomUUID();

    // Unknown address: same response shape, no email, no real challenge.
    if (!authorized) {
      return NextResponse.json({
        success: true,
        email: targetEmail,
        tenant_id: tenantId,
        challengeId: dummyChallengeId,
        expiresAt,
      });
    }

    const emailAllowed = await consumeRateLimit(
      `otp:email:${targetEmail}`,
      EMAIL_LIMIT,
      WINDOW_SECONDS
    );

    if (!emailAllowed) {
      // Do not reveal the per-address limit; keep the response identical.
      return NextResponse.json({
        success: true,
        email: targetEmail,
        tenant_id: tenantId,
        challengeId: dummyChallengeId,
        expiresAt,
      });
    }

    const challenge = await createOtpChallenge(targetEmail, hashIp(clientIp));
    if (!challenge) {
      return NextResponse.json(
        { error: "otp_unavailable", message: "Could not create a verification code." },
        { status: 500 }
      );
    }

    const sendResult = await sendOwnerOtpEmail(targetEmail, challenge.code, tenantId);
    if (sendResult && "error" in sendResult && sendResult.error) {
      console.error("OTP email delivery failed:", sendResult.error);
    }

    return NextResponse.json({
      success: true,
      email: targetEmail,
      tenant_id: tenantId,
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
    });
  } catch (err: unknown) {
    console.error("Error in send-otp:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
