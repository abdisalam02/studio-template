import { Resend } from "resend";
import type { Database } from "@/types/database";

export type Tenant = Database["public"]["Tables"]["tenants"]["Row"];

export interface BookingDetails {
  ref: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_name: string;
  price_nok: number;
  start_utc: number;
  end_utc: number;
  notes?: string | null;
  location?: string;
}

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
// Fallbacks from environment:
const defaultFromName = process.env.EMAIL_FROM_NAME || "Agure Booking";
const defaultReplyTo = process.env.EMAIL_REPLY_TO || "support@agure.space";

function getSenderInfo(tenant?: Tenant | null) {
  const displayName = tenant?.name ? tenant.name.replace(/["<>]/g, "").trim() : defaultFromName;
  const replyToAddress = tenant?.owner_email || defaultReplyTo;
  const from = `${displayName || defaultFromName} <booking@agure.space>`;
  return { from, replyTo: replyToAddress };
}

async function sendEmailSafely(payload: Parameters<NonNullable<typeof resend>["emails"]["send"]>[0]) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping email dispatch.");
    return { data: null, error: { name: "missing_api_key", message: "RESEND_API_KEY is not set" } };
  }
  try {
    const res = await resend.emails.send(payload);
    if (res.error) {
      console.error("RESEND SEND ERROR:", res.error);
    }
    return res;
  } catch (error) {
    console.error("RESEND SEND ERROR:", error);
    return { data: null, error };
  }
}

function formatOsloDateTime(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleString("no-NO", {
    timeZone: "Europe/Oslo",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendOwnerAlert(
  tenant: Tenant,
  booking: BookingDetails,
  actionUrl: string
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping owner alert email.");
    return { success: false, reason: "missing_api_key" };
  }

  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `Ny timebestilling: ${booking.customer_name} - ${booking.service_name}`;
  const adminBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  const reviewUrl = actionUrl || `${adminBaseUrl}/admin?ref=${encodeURIComponent(booking.ref)}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #171717; line-height: 1.5; padding: 24px 16px;">
      <h1 style="letter-spacing: 0.35em; font-size: 16px; text-transform: uppercase; font-weight: 700; color: #111113; margin: 0 auto 20px auto; text-align: center;">${escapeHtml(tenant.name || defaultFromName).toUpperCase()}</h1><!-- design-ok -->
      <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 16px; text-align: center;">Ny timebestilling mottatt</h2>
      <p style="margin-bottom: 24px; color: #525252; text-align: center;">En ny reservasjon venter på vurdering for <strong>${escapeHtml(tenant.name)}</strong>.</p>
      
      <div style="background-color: #f5f5f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #737373;">Kunde:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.customer_name)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Telefon:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.customer_phone)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">E-post:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.customer_email)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Behandling:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.service_name)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Tidspunkt:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(osloTime)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Pris:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${booking.price_nok} kr</td>
          </tr>
          ${
            booking.notes
              ? `<tr>
                  <td style="padding: 6px 0; color: #737373; vertical-align: top;">Notat:</td>
                  <td style="padding: 6px 0; font-weight: 500; text-align: right;">${escapeHtml(booking.notes)}</td>
                </tr>`
              : ""
          }
        </table>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${reviewUrl}" style="background-color: #171717; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 9999px; font-weight: 600; font-size: 14px; display: inline-block;">
          Vurder bestilling
        </a>
      </div>
      
      <p style="font-size: 12px; color: #a3a3a3; text-align: center;">Referanse: ${escapeHtml(booking.ref)}</p>
    </div>
  `;

  const { from, replyTo } = getSenderInfo(tenant);

  return sendEmailSafely({
    from,
    replyTo,
    to: [tenant.owner_email],
    subject,
    html,
  });
}

export async function sendCustomerReceipt(
  tenant: Tenant,
  booking: BookingDetails,
  manageUrl: string
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping customer receipt email.");
    return { success: false, reason: "missing_api_key" };
  }

  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `Mottatt timeforespørsel hos ${tenant.name}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #171717; line-height: 1.5; padding: 24px 16px;">
      <h1 style="letter-spacing: 0.35em; font-size: 16px; text-transform: uppercase; font-weight: 700; color: #111113; margin: 0 auto 20px auto; text-align: center;">${escapeHtml(tenant.name || defaultFromName).toUpperCase()}</h1><!-- design-ok -->
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Takk for din forespørsel</h2>
      <p style="margin-bottom: 24px; color: #525252;">Vi har mottatt din timeforespørsel hos <strong>${escapeHtml(tenant.name)}</strong>. Forespørselen vurderes nå av studioet, og du mottar en bekreftelse så snart timen er godkjent.</p>
      
      <div style="background-color: #f5f5f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #737373;">Referanse:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.ref)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Behandling:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.service_name)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Ønsket tid:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(osloTime)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Pris:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${booking.price_nok} kr</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #525252; margin-bottom: 20px;">
        Du kan administrere eller se status på din reservasjon her:<br/>
        <a href="${manageUrl}" style="color: #171717; text-decoration: underline; font-weight: 600;">Administrer din reservasjon</a>
      </p>

      <p style="font-size: 12px; color: #a3a3a3; border-top: 1px solid #e5e5e5; padding-top: 16px;">
        Ikke deg? Ignorer denne e-posten.
      </p>
    </div>
  `;

  const { from, replyTo } = getSenderInfo(tenant);

  return sendEmailSafely({
    from,
    replyTo,
    to: [booking.customer_email],
    subject,
    html,
  });
}

export async function sendCustomerConfirmation(
  tenant: Tenant,
  booking: BookingDetails,
  icsContent: string
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping customer confirmation email.");
    return { success: false, reason: "missing_api_key" };
  }

  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `Bekreftet: Din time hos ${tenant.name}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #171717; line-height: 1.5; padding: 24px 16px;">
      <h1 style="letter-spacing: 0.35em; font-size: 16px; text-transform: uppercase; font-weight: 700; color: #111113; margin: 0 auto 20px auto; text-align: center;">${escapeHtml(tenant.name || defaultFromName).toUpperCase()}</h1><!-- design-ok -->
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #15803d;">Din time er bekreftet</h2>
      <p style="margin-bottom: 24px; color: #525252;">Din time er bekreftet! Vi gleder oss til å se deg hos <strong>${escapeHtml(tenant.name)}</strong>.</p>
      
      <div style="background-color: #f5f5f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #737373;">Referanse:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.ref)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Behandling:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.service_name)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Tidspunkt:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(osloTime)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Pris:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${booking.price_nok} kr</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #525252;">Kalenderfil (.ics) er lagt ved denne e-posten slik at du enkelt kan legge avtalen til i kalenderen din.</p>
    </div>
  `;

  const { from: confirmationFrom, replyTo: confirmationReplyTo } = getSenderInfo(tenant);

  return sendEmailSafely({
    from: confirmationFrom,
    replyTo: confirmationReplyTo,
    to: [booking.customer_email],
    subject,
    html,
    attachments: [
      {
        filename: "appointment.ics",
        content: Buffer.from(icsContent, "utf-8"),
        contentType: "text/calendar",
      },
    ],
  });
}

export async function sendCustomerDeclined(
  tenant: Tenant,
  booking: BookingDetails
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping customer declined email.");
    return { success: false, reason: "missing_api_key" };
  }

  const subject = `Oppdatering angående din time hos ${tenant.name}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #171717; line-height: 1.5;">
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Oppdatering om din timeforespørsel</h2>
      <p style="margin-bottom: 24px; color: #525252;">Forespørselen din kunne dessverre ikke bekreftes denne gangen. Besøk vår nettside for å velge et annet tidspunkt.</p>
      
      <div style="background-color: #f5f5f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #737373;">Referanse:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.ref)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Behandling:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.service_name)}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #525252;">Ta gjerne kontakt med oss dersom du har spørsmål.</p>
    </div>
  `;

  const { from, replyTo } = getSenderInfo(tenant);

  return sendEmailSafely({
    from,
    replyTo,
    to: [booking.customer_email],
    subject,
    html,
  });
}

export async function sendOwnerCancellationAlert(
  tenant: Tenant,
  booking: BookingDetails
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping owner cancellation alert email.");
    return { success: false, reason: "missing_api_key" };
  }

  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `Avbestilling: ${booking.customer_name} - ${booking.service_name}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #171717; line-height: 1.5;">
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #dc2626;">Kunde har avbestilt time</h2>
      <p style="margin-bottom: 24px; color: #525252;">En kunde har avbestilt sin time hos <strong>${escapeHtml(tenant.name)}</strong>.</p>
      
      <div style="background-color: #f5f5f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #737373;">Referanse:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.ref)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Kunde:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.customer_name)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Telefon:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.customer_phone)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Behandling:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.service_name)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Opprinnelig tid:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(osloTime)}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #525252;">Tidspunktet er nå frigjort i kalenderen.</p>
    </div>
  `;

  const { from, replyTo } = getSenderInfo(tenant);

  return sendEmailSafely({
    from,
    replyTo,
    to: [tenant.owner_email],
    subject,
    html,
  });
}

export async function sendOwnerOtpEmail(email: string, code: string) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping OTP email.");
    return { success: false, reason: "missing_api_key" };
  }

  const subject = `Din verifiseringskode: ${code}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #111113; line-height: 1.6; padding: 24px;">
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Studio Administrasjon</h2>
      <p style="font-size: 14px; color: #666; margin-bottom: 24px;">Bruk følgende 6-sifrede kode for å logge inn på ditt kontrollpanel. Koden er gyldig i 15 minutter.</p>
      <div style="background: #f4f2ee; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #111113; font-family: monospace;">${code}</span>
      </div>
      <p style="font-size: 12px; color: #999;">Dersom du ikke har bedt om denne koden, kan du trygt se bort fra denne e-posten.</p>
    </div>
  `;

  try {
    const { from, replyTo } = getSenderInfo(null);
    const result = await sendEmailSafely({
      from,
      replyTo,
      to: [email],
      subject,
      html,
    });
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data };
  } catch (err) {
    console.error("RESEND SEND ERROR:", err);
    return { success: false, error: err };
  }
}

export async function sendCustomerRescheduleConfirmation(
  tenant: Tenant,
  booking: BookingDetails,
  icsContent: string
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping customer reschedule email.");
    return { success: false, reason: "missing_api_key" };
  }

  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `Nytt tidspunkt bekreftet hos ${tenant.name}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #171717; line-height: 1.5;">
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Timen din har fått nytt tidspunkt</h2>
      <p style="margin-bottom: 24px; color: #525252;">Dette er en bekreftelse på at din time hos <strong>${escapeHtml(tenant.name)}</strong> har blitt flyttet.</p>
      
      <div style="background-color: #f5f5f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #737373;">Referanse:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.ref)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Behandling:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(booking.service_name)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Nytt tidspunkt:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(osloTime)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Pris:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${booking.price_nok} kr</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #525252;">Oppdatert kalenderfil (.ics) er lagt ved denne e-posten.</p>
    </div>
  `;

  const { from, replyTo } = getSenderInfo(tenant);

  return sendEmailSafely({
    from,
    replyTo,
    to: [booking.customer_email],
    subject,
    html,
    attachments: [
      {
        filename: "updated_appointment.ics",
        content: Buffer.from(icsContent, "utf-8"),
        contentType: "text/calendar",
      },
    ],
  });
}

export async function sendTestNotificationEmail(tenant: Tenant, recipientEmail: string) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping test notification email.");
    return { success: false, reason: "missing_api_key" };
  }

  const subject = `Testvarsel fra ${tenant.name}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; color: #171717; line-height: 1.6; padding: 24px;">
      <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 12px;">Test av e-postvarsling</h2>
      <p style="font-size: 14px; color: #525252; margin-bottom: 16px;">Dette er et testvarsel sendt fra ditt kontrollpanel for <strong>${escapeHtml(tenant.name)}</strong>.</p>
      <div style="background: #f4f2ee; border-radius: 8px; padding: 14px; font-size: 13px; color: #333;">
        Status: E-postintegrasjon via Resend fungerer som forventet.
      </div>
    </div>
  `;

  const { from, replyTo } = getSenderInfo(tenant);

  return sendEmailSafely({
    from,
    replyTo,
    to: [recipientEmail],
    subject,
    html,
  });
}

