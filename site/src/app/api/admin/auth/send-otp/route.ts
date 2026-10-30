import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createOtpChallenge } from "@/lib/otpStore";
import { sendOwnerOtpEmail, sendPlatformOtpEmail } from "@/lib/email";
import { consumeRateLimit, getClientIp, hashIp } from "@/lib/rateLimit";
import { resolveTenantForEmail, isTenantAdmin } from "@/lib/tenantAuth";
import { isPlatformAdmin } from "@/lib/platformAuth";
import { resolveTenant } from "@/lib/tenantResolver";

export const dynamic = "force-dynamic"; // design-ok

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
    const requestedScope = String(body.scope || "").trim().toLowerCase();
    const requestedTenant = String(body.tenant_id ?? body.tenantId ?? "").trim().toLowerCase();
    const allowSeed = process.env.NODE_ENV === "development";

    const expiresAt = Date.now() + OTP_TTL_MS;
    const dummyChallengeId = crypto.randomUUID();

    // 1. PLATFORM SCOPE: Strictly verify `platform_admins` and send Platform OTP email
    if (requestedScope === "platform") {
      const platformAuthorized = Boolean(requestedEmail) && (await isPlatformAdmin(requestedEmail));
      if (!platformAuthorized) {
        return NextResponse.json({
          success: true,
          email: requestedEmail,
          scope: "platform",
          tenant_id: null,
          challengeId: dummyChallengeId,
          expiresAt,
        });
      }

      const emailAllowed = await consumeRateLimit(
        `otp:email:${requestedEmail}`,
        EMAIL_LIMIT,
        WINDOW_SECONDS
      );
      if (!emailAllowed) {
        return NextResponse.json({
          success: true,
          email: requestedEmail,
          scope: "platform",
          tenant_id: null,
          challengeId: dummyChallengeId,
          expiresAt,
        });
      }

      const challenge = await createOtpChallenge(requestedEmail, hashIp(clientIp));
      if (!challenge) {
        return NextResponse.json(
          { error: "otp_unavailable", message: "Could not create a verification code." },
          { status: 500 }
        );
      }

      const sendResult = await sendPlatformOtpEmail(requestedEmail, challenge.code);
      if (sendResult && "error" in sendResult && sendResult.error) {
        console.error("Platform OTP email delivery failed:", sendResult.error);
      }

      return NextResponse.json({
        success: true,
        email: requestedEmail,
        scope: "platform",
        tenant_id: null,
        sender_identity: "A.Gure Platform Control Center",
        challengeId: challenge.id,
        expiresAt: challenge.expiresAt,
      });
    }

    // 2. TENANT SCOPE: Never resolve to Gangina by accident when an explicit tenant is requested
    const platformAdmin = await isPlatformAdmin(requestedEmail);
    const requestedResolved = requestedTenant
      ? await resolveTenant(requestedTenant, { allowSeed })
      : null;
    const requestedAllowed = requestedResolved
      ? await isTenantAdmin(requestedEmail, requestedResolved.id)
      : false;

    const tenantId = requestedTenant
      ? requestedAllowed
        ? requestedResolved?.id || null
        : null
      : await resolveTenantForEmail(requestedEmail);

    const config = tenantId
      ? await resolveTenant(tenantId, { allowSeed })
      : requestedResolved;
    // Never fall back to the studio owner's address here: an unauthenticated
    // caller could otherwise enumerate it in the uniform response (and trigger
    // mail) by posting only a tenant id.
    const targetEmail = requestedEmail;

    const authorized =
      Boolean(targetEmail) &&
      Boolean(tenantId) &&
      (platformAdmin || (await isTenantAdmin(targetEmail, tenantId)));

    // Unknown address or unauthorized for requested tenant: uniform 200 response
    if (!authorized || !tenantId) {
      return NextResponse.json({
        success: true,
        email: targetEmail,
        scope: "tenant",
        tenant_id: tenantId || requestedTenant,
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
        scope: "tenant",
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
      scope: "tenant",
      tenant_id: tenantId,
      sender_identity: config?.name || tenantId,
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
    });
  } catch (err: unknown) {
    console.error("Error in send-otp:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

