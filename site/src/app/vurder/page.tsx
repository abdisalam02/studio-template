import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { redirect } from "next/navigation";

interface VurderPageProps {
  searchParams: Promise<{
    ref?: string;
    token?: string;
  }>;
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

export default async function VurderPage({ searchParams }: VurderPageProps) {
  const { ref, token } = await searchParams;

  // If both ref and token are present, redirect to the secure tokenized action page
  if (ref && token) {
    redirect(`/a/${encodeURIComponent(ref)}.${encodeURIComponent(token)}`);
  }

  let booking = null;
  if (ref && supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("bookings")
      .select("*, tenants(*), services(*)")
      .eq("ref", ref.trim().toUpperCase())
      .maybeSingle();
    booking = data;
  }

  const tenant = booking?.tenants as { name?: string } | null;
  const service = booking?.services as { name?: string; duration_min?: number } | null;

  return (
    <main className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
        <header className="border-b border-border pb-4 space-y-1 text-center">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted">
            {tenant?.name || "Gangina Beauty Studio"} · Vurdering & Status
          </p>
          <h1 className="text-xl font-bold font-mono tracking-tight">
            {booking ? "Timebestilling" : "Vurder din opplevelse"}
          </h1>
        </header>

        {booking ? (
          <div className="space-y-4 font-mono text-xs">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted">Referanse:</span>
              <span className="font-bold">{booking.ref}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted">Status:</span>
              <span className={`font-bold uppercase ${
                booking.status === "confirmed"
                  ? "text-emerald-500"
                  : booking.status === "pending"
                  ? "text-amber-500"
                  : "text-red-500"
              }`}>
                {booking.status === "confirmed"
                  ? "Bekreftet"
                  : booking.status === "pending"
                  ? "Venter på godkjenning"
                  : "Kansellert / Avslått"}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted">Behandling:</span>
              <span className="font-bold">{service?.name || "Tannkrystall / Behandling"}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted">Tidspunkt:</span>
              <span className="font-bold capitalize">{formatOsloDateTime(booking.start_utc)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted">Pris:</span>
              <span className="font-bold">{booking.price_nok} kr</span>
            </div>

            <div className="pt-4 text-center space-y-3">
              <p className="text-muted text-xs">
                Er du studioeier? Logg inn for å godkjenne eller redigere:
              </p>
              <Link
                href={`/admin?ref=${encodeURIComponent(booking.ref)}`}
                className="inline-block bg-foreground text-background px-5 py-2.5 rounded-full font-mono text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Åpne i kontrollpanel ↗
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center py-4">
            <p className="text-sm text-muted">
              Takk for at du besøker Gangina. Vi setter stor pris på din tilbakemelding.
            </p>
            <div className="flex justify-center gap-2 py-3 text-2xl text-amber-400">
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span>★</span>
            </div>
            <p className="text-xs text-muted">
              Har du en referansekode for din bestilling?
            </p>
            <form action="/vurder" method="GET" className="flex gap-2 justify-center max-w-xs mx-auto">
              <input
                type="text"
                name="ref"
                placeholder="GNG-XXXXX"
                className="px-3 py-2 border border-border rounded-lg text-xs font-mono uppercase bg-transparent w-full text-foreground"
              />
              <button
                type="submit"
                className="bg-foreground text-background px-4 py-2 rounded-lg text-xs font-mono font-semibold"
              >
                Søk
              </button>
            </form>
          </div>
        )}

        <footer className="pt-4 border-t border-border/50 text-center">
          <Link href="/admin" className="text-[11px] font-mono text-muted hover:text-foreground underline">
            Gå til studio administrasjon
          </Link>
        </footer>
      </div>
    </main>
  );
}
