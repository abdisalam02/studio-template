"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  // Step 1: "email", Step 2: "otp"
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first digit input when entering OTP step
  useEffect(() => {
    if (step === "otp") {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  // Request 6-digit code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      // 1. Trigger internal Resend OTP dispatch
      const res = await fetch("/api/admin/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Kunne ikke sende engangskode.");
      }

      if (data.challengeToken) {
        setChallengeToken(data.challengeToken);
      }

      // Also trigger Supabase OTP if client configured
      if (supabase) {
        await supabase.auth.signInWithOtp({ email }).catch(() => {});
      }

      if (data.devCode) {
        setInfo(`Utviklingsmodus: Koden din er ${data.devCode}`);
      }

      setStep("otp");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kunne ikke sende kode.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle digit change with auto-advance
  const handleDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, "");
    if (!cleanVal) {
      const next = [...otp];
      next[index] = "";
      setOtp(next);
      return;
    }

    const next = [...otp];
    next[index] = cleanVal[cleanVal.length - 1]; // take last character
    setOtp(next);

    // Auto-advance to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste full code
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasted) return;

    const next = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtp(next);

    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  // Verify 6-digit code
  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = otp.join("");
    if (fullCode.length !== 6) {
      setError("Vennligst fyll ut alle 6 sifrene.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Try Supabase verifyOtp first if available
      let verifiedSession = false;
      if (supabase) {
        const { data: supaData, error: supaErr } = await supabase.auth.verifyOtp({
          email,
          token: fullCode,
          type: "email",
        });

        if (!supaErr && supaData?.session) {
          localStorage.setItem("dev_admin_token", supaData.session.access_token);
          localStorage.setItem("dev_admin_email", email);
          verifiedSession = true;
          router.push("/admin");
          return;
        }
      }

      // 2. Verify via internal API route
      const res = await fetch("/api/admin/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode, challengeToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Ugyldig verifiseringskode.");
      }

      localStorage.setItem("dev_admin_token", data.token);
      localStorage.setItem("dev_admin_email", email);
      router.push("/admin");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kunne ikke verifisere koden.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Developer Instant-Access Bypass
  const handleDevBypass = async () => {
    setDevLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "niwache12@gmail.com" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Dev login feilet.");
      }

      localStorage.setItem("dev_admin_token", data.token);
      localStorage.setItem("dev_admin_email", data.email);

      router.push("/admin");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Hurtiginnlogging feilet.";
      setError(msg);
    } finally {
      setDevLoading(false);
    }
  };

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <main className="min-h-dvh bg-[#FAF8F5] text-[#111113] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md rounded-3xl border border-[#EAE6E1] bg-white p-7 sm:p-9 space-y-7 shadow-sm">
        {/* Header with Monogram Badge */}
        <header className="space-y-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#111113] text-white flex items-center justify-center mx-auto text-sm font-bold tracking-widest uppercase">
            ST
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#8a8a8a] font-semibold">
              Studio Administrasjon
            </p>
            <h1 className="text-xl font-bold tracking-tight text-[#111113]">
              {step === "email" ? "Logg inn med kode" : "Verifiser kode"}
            </h1>
          </div>
        </header>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {info && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center font-mono">
            {info}
          </div>
        )}

        {/* STEP 1: Email Input */}
        {step === "email" && (
          <form onSubmit={handleRequestCode} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[#8a8a8a] uppercase text-[10px] tracking-wider block font-semibold">
                E-postadresse for studioeier
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="eier@studio.no"
                className="w-full p-3.5 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113] transition-colors text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading || devLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#111113] text-white font-semibold uppercase tracking-wider text-xs hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? "Sender engangskode..." : "Send 6-sifret kode"}
            </button>
          </form>
        )}

        {/* STEP 2: 6-Digit OTP Entry */}
        {step === "otp" && (
          <form onSubmit={handleVerifyCode} className="space-y-5 text-xs">
            <div className="text-center space-y-1">
              <p className="text-[#8a8a8a] text-xs">
                Vi har sendt en 6-sifret kode til <strong className="text-[#111113]">{email}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError(null);
                  setInfo(null);
                }}
                className="text-[11px] text-[#8a8a8a] hover:text-[#111113] underline cursor-pointer"
              >
                Endre e-postadresse
              </button>
            </div>

            {/* 6 Digit Input Boxes */}
            <div className="flex justify-between gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113] focus:bg-white transition-colors"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join("").length !== 6}
              className="w-full py-3.5 px-4 rounded-xl bg-[#111113] text-white font-semibold uppercase tracking-wider text-xs hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? "Verifiserer..." : "Bekreft og logg inn"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleRequestCode}
                disabled={loading}
                className="text-[11px] text-[#8a8a8a] hover:text-[#111113] transition-colors cursor-pointer"
              >
                Fikk du ikke koden? Send på nytt
              </button>
            </div>
          </form>
        )}

        {/* Developer Instant-Access Bypass Button */}
        {isDev && (
          <div className="pt-4 border-t border-[#EAE6E1] space-y-2 text-center">
            <button
              type="button"
              disabled={loading || devLoading}
              onClick={handleDevBypass}
              className="w-full py-3 px-4 rounded-xl border border-amber-600/30 bg-amber-50 text-amber-900 font-mono text-xs font-bold uppercase tracking-wider hover:bg-amber-100 disabled:opacity-50 transition-all cursor-pointer"
            >
              {devLoading
                ? "Logger inn..."
                : "Hurtiginnlogging (Dev Mode - Gangina)"}
            </button>
            <p className="text-[10px] text-[#8a8a8a]">
              Bypasser e-postbekreftelse for testing.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
