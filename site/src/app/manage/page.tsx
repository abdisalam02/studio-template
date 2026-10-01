import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { redirect } from "next/navigation";

interface ManagePageProps {
  searchParams: Promise<{
    ref?: string;
    token?: string;
  }>;
}

export default async function ManagePage({ searchParams }: ManagePageProps) {
  const { ref, token } = await searchParams;

  if (ref && token) {
    redirect(`/m/${encodeURIComponent(ref)}.${encodeURIComponent(token)}`);
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

  return (
    <main className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
        <header className="border-b border-border pb-4 space-y-1 text-center">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted">
            {tenant?.name || "Gangina Beauty Studio"} · Administrer reservasjon
          </p>
          <h1 className="text-xl font-bold font-mono tracking-tight">
            Din reservasjon
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
              <span className="font-bold capitalize">{booking.status}</span>
            </div>
            <p className="text-muted text-xs text-center pt-2">
              For å avbestille eller endre, vennligst bruk den personlige lenken du mottok på e-post.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-center py-4">
            <p className="text-xs text-muted">
              Skriv inn din referansekode for å finne din reservasjon:
            </p>
            <form action="/manage" method="GET" className="flex gap-2 justify-center max-w-xs mx-auto">
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
                Finn
              </button>
            </form>
          </div>
        )}

        <footer className="pt-4 border-t border-border/50 text-center">
          <Link href="/" className="text-[11px] font-mono text-muted hover:text-foreground underline">
            Tilbake til forsiden
          </Link>
        </footer>
      </div>
    </main>
  );
}
