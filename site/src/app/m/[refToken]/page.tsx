import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { parseRefToken, verifyToken } from "@/lib/tokens";
import { CancelButton } from "./CancelButton";
import type { BookingStatus } from "@/types/database";

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

function getStatusBadge(status: BookingStatus) {
  switch (status) {
    case "confirmed":
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          Bekreftet
        </span>
      );
    case "pending":
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
          Venter godkjenning
        </span>
      );
    case "cancelled":
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-neutral-500/10 text-neutral-500 border border-neutral-500/20">
          Avbestilt
        </span>
      );
    case "declined":
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 border border-red-500/20">
          Avslått
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-muted/20 text-muted border border-border">
          {status}
        </span>
      );
  }
}

export default async function CustomerManagePage({ params }: PageProps) {
  const { refToken } = await params;
  const parsed = parseRefToken(refToken);

  if (!parsed || !supabaseAdmin) {
    notFound();
  }

  const { ref, token } = parsed;

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("*, tenants(*), services(*)")
    .eq("ref", ref)
    .single();

  if (error || !booking) {
    notFound();
  }

  const isValid = verifyToken(token, booking.manage_token_hash);
  if (!isValid) {
    notFound();
  }

  const tenant = booking.tenants as unknown as {
    name: string;
    phone?: string;
    email?: string;
  } | null;

  const service = booking.services as unknown as {
    name: string;
    duration_min: number;
  } | null;

  const timeString = formatOsloDateTime(booking.start_utc);
  const canCancel = booking.status === "pending" || booking.status === "confirmed";

  return (
    <main className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm font-mono">
        <header className="border-b border-border pb-4 space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted">
            {tenant?.name || "Studio"} · Din Reservasjon
          </p>
          <div className="flex items-center justify-between pt-1">
            <h1 className="text-xl font-bold tracking-tight">Timeavtale</h1>
            {getStatusBadge(booking.status)}
          </div>
        </header>

        <section className="space-y-3 text-xs">
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Referanse:</span>
            <span className="font-bold">{booking.ref}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Studio:</span>
            <span className="font-bold">{tenant?.name || "Studio"}</span>
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

          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Registrert på:</span>
            <span className="font-bold">{booking.customer_name}</span>
          </div>
        </section>

        {canCancel ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-muted/10 border border-border text-[11px] text-muted space-y-1">
              <p className="font-bold text-foreground">Avbestillingsvilkår:</p>
              <p>Avbestilling må skje senest 24 timer før avtalt tid.</p>
            </div>

            <CancelButton
              refCode={booking.ref}
              token={token}
              initialStatus={booking.status}
            />
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-muted/10 border border-border text-[11px] text-center text-muted">
            {booking.status === "cancelled"
              ? "Denne timen er avbestilt."
              : booking.status === "declined"
              ? "Denne timeforespørselen ble avslått."
              : `Status: ${booking.status}`}
          </div>
        )}
      </div>
    </main>
  );
}
