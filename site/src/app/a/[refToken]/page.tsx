import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { parseRefToken, verifyToken } from "@/lib/tokens";
import { ActionButtons } from "./ActionButtons";

interface PageProps {
  params: Promise<{ refToken: string }>;
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

export default async function OwnerReviewPage({ params }: PageProps) {
  const { refToken } = await params;
  const parsed = parseRefToken(refToken);

  if (!parsed || !supabaseAdmin) {
    return (
      <main className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center space-y-4 font-mono text-xs">
          <h1 className="text-base font-bold text-red-500">Ugyldig lenke</h1>
          <p className="text-muted">Denne vurderingslenken er ufullstendig eller feilformatert.</p>
          <a href="/admin" className="inline-block bg-foreground text-background px-4 py-2 rounded-lg font-semibold">
            Gå til kontrollpanel
          </a>
        </div>
      </main>
    );
  }

  const { ref, token } = parsed;

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("*, tenants(*), services(*)")
    .eq("ref", ref)
    .single();

  if (error || !booking) {
    return (
      <main className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center space-y-4 font-mono text-xs">
          <h1 className="text-base font-bold text-red-500">Bestilling ikke funnet</h1>
          <p className="text-muted">Fant ingen bestilling med referanse {ref}.</p>
          <a href="/admin" className="inline-block bg-foreground text-background px-4 py-2 rounded-lg font-semibold">
            Gå til kontrollpanel
          </a>
        </div>
      </main>
    );
  }

  const isValid = verifyToken(token, booking.action_token_hash);
  if (!isValid) {
    return (
      <main className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center space-y-4 font-mono text-xs">
          <h1 className="text-base font-bold text-amber-500">Sikkerhetslenke utløpt</h1>
          <p className="text-muted">Sikkerhetskoden for direkte vurdering er ugyldig eller allerede brukt.</p>
          <a href={`/admin?ref=${encodeURIComponent(ref)}`} className="inline-block bg-foreground text-background px-4 py-2 rounded-lg font-semibold">
            Logg inn for å vurdere i kontrollpanelet
          </a>
        </div>
      </main>
    );
  }

  const tenant = booking.tenants as unknown as {
    name: string;
    timezone: string;
  } | null;

  const service = booking.services as unknown as {
    name: string;
    duration_min: number;
  } | null;

  const timeString = formatOsloDateTime(booking.start_utc);

  return (
    <main className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
        <header className="border-b border-border pb-4 space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted">
            {tenant?.name || "Studio"} · Timeforespørsel
          </p>
          <h1 className="text-xl font-bold font-mono tracking-tight">
            Vurder bestilling
          </h1>
        </header>

        <section className="space-y-3 font-mono text-xs">
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Referanse:</span>
            <span className="font-bold">{booking.ref}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Kunde:</span>
            <span className="font-bold">{booking.customer_name}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Telefon:</span>
            <a href={`tel:${booking.customer_phone}`} className="font-bold underline">
              {booking.customer_phone}
            </a>
          </div>

          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">E-post:</span>
            <a href={`mailto:${booking.customer_email}`} className="font-bold underline">
              {booking.customer_email}
            </a>
          </div>

          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Behandling:</span>
            <span className="font-bold">
              {service?.name || "Behandling"} ({service?.duration_min || 0} min)
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Tidspunkt:</span>
            <span className="font-bold capitalize">{timeString}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Pris:</span>
            <span className="font-bold">{booking.price_nok} kr</span>
          </div>

          {booking.notes && (
            <div className="py-2 space-y-1">
              <span className="text-muted block">Notat fra kunde:</span>
              <p className="p-3 rounded-lg bg-muted/10 text-foreground text-xs whitespace-pre-wrap">
                {booking.notes}
              </p>
            </div>
          )}
        </section>

        <ActionButtons
          refCode={booking.ref}
          token={token}
          currentStatus={booking.status}
        />
      </div>
    </main>
  );
}
