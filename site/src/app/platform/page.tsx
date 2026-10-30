"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface PlatformTenant {
  id: string;
  name: string;
  active?: boolean;
  currency?: string;
  ref_prefix?: string;
  owner_email?: string;
  contact_email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  org_number?: string;
  from_name?: string;
  reply_to?: string;
  service_count?: number;
  domain_count?: number;
  admin_count?: number;
  branding?: {
    monogram?: string;
    tagline?: string;
    palette?: {
      accent?: string;
      canvas?: string;
      card?: string;
    };
    typography?: {
      heading?: string;
      body?: string;
    };
    assets?: {
      logo_url?: string;
      favicon_url?: string;
      watermark_url?: string;
      hero_url?: string;
    };
  };
  logo_url?: string;
  created_at?: string;
}

interface AuditEvent {
  id: string;
  tenant_id: string;
  action: string;
  actor_email?: string;
  booking_ref?: string;
  created_at: string;
}

interface StudioFolioTheme {
  bg: string;
  surface: string;
  accent: string;
  canopy: string;
  text: string;
  sub: string;
  border: string;
  pillBg: string;
  folioName: string;
  year: string;
}

// Option 3: Sanzo Wada 1930s Studio Folio Dual-Tone Lacquer Palettes
const STUDIO_THEMES: Record<string, StudioFolioTheme> = {
  noire: {
    bg: "#FAF8F5",
    surface: "#FFFFFF",
    accent: "#C4A482",
    canopy: "#121214",
    text: "#18181B",
    sub: "#716B61",
    border: "rgba(196, 164, 130, 0.35)",
    pillBg: "rgba(196, 164, 130, 0.15)",
    folioName: "Kuro-Kin Folio",
    year: "1934",
  },
  gangina: {
    bg: "#F6F8F5",
    surface: "#FFFFFF",
    accent: "#7E9F85",
    canopy: "#131F17",
    text: "#14221F",
    sub: "#4A6860",
    border: "rgba(126, 159, 133, 0.38)",
    pillBg: "rgba(126, 159, 133, 0.16)",
    folioName: "Sabi-Seiji Folio",
    year: "1932",
  },
  "studio-klo": {
    bg: "#F7F7FA",
    surface: "#FFFFFF",
    accent: "#9285B4",
    canopy: "#151724",
    text: "#1D1627",
    sub: "#5E4D73",
    border: "rgba(146, 133, 180, 0.35)",
    pillBg: "rgba(146, 133, 180, 0.15)",
    folioName: "Edo-Murasaki Folio",
    year: "1935",
  },
  "demo-studio": {
    bg: "#F8F7F3",
    surface: "#FFFFFF",
    accent: "#A49767",
    canopy: "#1A1C16",
    text: "#22211A",
    sub: "#615E4C",
    border: "rgba(164, 151, 103, 0.35)",
    pillBg: "rgba(164, 151, 103, 0.15)",
    folioName: "Rikyū-cha Folio",
    year: "1933",
  },
};

const FOLIO_PRESETS: StudioFolioTheme[] = [
  {
    bg: "#FAF8F5",
    surface: "#FFFFFF",
    accent: "#C4A482",
    canopy: "#121214",
    text: "#18181B",
    sub: "#716B61",
    border: "rgba(196, 164, 130, 0.35)",
    pillBg: "rgba(196, 164, 130, 0.15)",
    folioName: "Kuro-Kin Folio",
    year: "1934",
  },
  {
    bg: "#F6F8F5",
    surface: "#FFFFFF",
    accent: "#7E9F85",
    canopy: "#131F17",
    text: "#14221F",
    sub: "#4A6860",
    border: "rgba(126, 159, 133, 0.38)",
    pillBg: "rgba(126, 159, 133, 0.16)",
    folioName: "Sabi-Seiji Folio",
    year: "1932",
  },
  {
    bg: "#F7F7FA",
    surface: "#FFFFFF",
    accent: "#9285B4",
    canopy: "#151724",
    text: "#1D1627",
    sub: "#5E4D73",
    border: "rgba(146, 133, 180, 0.35)",
    pillBg: "rgba(146, 133, 180, 0.15)",
    folioName: "Edo-Murasaki Folio",
    year: "1935",
  },
  {
    bg: "#FBF9F7",
    surface: "#FFFFFF",
    accent: "#C86D51",
    canopy: "#1C1917",
    text: "#241814",
    sub: "#6E5047",
    border: "rgba(200, 109, 81, 0.35)",
    pillBg: "rgba(200, 109, 81, 0.15)",
    folioName: "Kuri-Koge Folio",
    year: "1936",
  },
  {
    bg: "#F8F7F3",
    surface: "#FFFFFF",
    accent: "#A49767",
    canopy: "#1A1C16",
    text: "#22211A",
    sub: "#615E4C",
    border: "rgba(164, 151, 103, 0.35)",
    pillBg: "rgba(164, 151, 103, 0.15)",
    folioName: "Rikyū-cha Folio",
    year: "1933",
  },
];

function getStudioTheme(id: string, index: number): StudioFolioTheme {
  if (STUDIO_THEMES[id]) return STUDIO_THEMES[id];
  return FOLIO_PRESETS[index % FOLIO_PRESETS.length];
}

export default function PlatformControlPage() {
  const router = useRouter();

  // Auth & Session
  const [session, setSession] = useState<{
    authenticated: boolean;
    email?: string;
    scope?: string;
  } | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [loginStep, setLoginStep] = useState<"email" | "code">("email");
  const [loginEmail, setLoginEmail] = useState("niwache12@gmail.com");
  const [loginPin, setLoginPin] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Platform Data
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [topView, setTopView] = useState<"matrix" | "audit">("matrix");
  const [toastMessage, setToastMessage] = useState("");

  // Mode B: Studio Workbench State
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenant | null>(null);
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<
    "branding" | "contacts" | "catalog" | "access" | "audit"
  >("branding");

  // Workbench Form Drafts
  const [brandingDraft, setBrandingDraft] = useState({
    accent: "#C4A482",
    canvas: "#0A0A0A",
    card: "#18181B",
    headingFont: "Cinzel",
    bodyFont: "Montserrat",
    monogram: "",
    tagline: "",
  });

  const [contactDraft, setContactDraft] = useState({
    name: "",
    contact_email: "",
    phone: "",
    whatsapp: "",
    address: "",
    org_number: "",
    owner_email: "",
    from_name: "",
    reply_to: "",
  });

  // Services Catalog
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("950");
  const [newServiceDuration, setNewServiceDuration] = useState("60");

  // Provisioning Modal
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provName, setProvName] = useState("");
  const [provSlug, setProvSlug] = useState("");
  const [provOwnerEmail, setProvOwnerEmail] = useState("");
  const [provCurrency, setProvCurrency] = useState("NOK");
  const [provPrefix, setProvPrefix] = useState("");
  const [provAddress, setProvAddress] = useState("");

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  }

  // Mobile viewport detection & preview sheet
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [showMobilePreviewModal, setShowMobilePreviewModal] = useState(false);

  useEffect(() => {
    function checkViewport() {
      setIsMobileViewport(window.innerWidth < 960);
    }
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // Check platform session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.scope === "platform") {
            setSession(data);
            setIsLocked(false);
          } else {
            setIsLocked(true);
          }
        }
      } catch (_) {
        setIsLocked(true);
      }
    }
    checkAuth();
  }, []);

  // Fetch platform tenants and audit feed
  async function loadPlatformData() {
    try {
      const [tRes, aRes] = await Promise.all([
        fetch("/api/platform/tenants"),
        fetch("/api/platform/audit"),
      ]);

      if (tRes.ok) {
        const tData = await tRes.json();
        if (Array.isArray(tData.tenants)) {
          setTenants(tData.tenants);
          // Sync selected tenant if already open
          if (selectedTenant) {
            const updated = tData.tenants.find((t: PlatformTenant) => t.id === selectedTenant.id);
            if (updated) setSelectedTenant(updated);
          }
        }
      }

      if (aRes.ok) {
        const aData = await aRes.json();
        if (Array.isArray(aData.events)) {
          setAuditEvents(aData.events);
        }
      }
    } catch (err) {
      console.error("Failed to load platform data:", err);
    }
  }

  useEffect(() => {
    if (!isLocked) loadPlatformData();
  }, [isLocked]);

  // When a studio is selected for workbench
  function handleSelectStudio(t: PlatformTenant) {
    setSelectedTenant(t);
    setBrandingDraft({
      accent: t.branding?.palette?.accent || "#C4A482",
      canvas: t.branding?.palette?.canvas || "#0A0A0A",
      card: t.branding?.palette?.card || "#18181B",
      headingFont: t.branding?.typography?.heading || "Cinzel",
      bodyFont: t.branding?.typography?.body || "Montserrat",
      monogram: t.branding?.monogram || t.name.slice(0, 2).toUpperCase(),
      tagline: t.branding?.tagline || "Studio Manager",
    });
    setContactDraft({
      name: t.name || "",
      contact_email: t.contact_email || "",
      phone: t.phone || "",
      whatsapp: t.whatsapp || "",
      address: t.address || "",
      org_number: t.org_number || "",
      owner_email: t.owner_email || "",
      from_name: t.from_name || t.name || "",
      reply_to: t.reply_to || t.contact_email || t.owner_email || "",
    });
    // Fetch catalog
    fetch(`/api/platform/tenants/${encodeURIComponent(t.id)}/services`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.services)) setServicesList(data.services);
      })
      .catch(() => {});
  }

  // OTP Login Handlers
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    if (!loginEmail.trim()) {
      setLoginError("Please enter your email address.");
      return;
    }
    setIsSubmittingLogin(true);
    try {
      const res = await fetch("/api/admin/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          scope: "platform",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChallengeId(data.challengeId);
        setLoginStep("code");
        showToast("✓ Platform verification code sent to your inbox");
      } else {
        setLoginError(data.error || data.message || "Account not authorized for Platform Control Center.");
      }
    } catch (_) {
      setLoginError("Network connection error. Please try again.");
    } finally {
      setIsSubmittingLogin(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    if (!loginPin.trim() || loginPin.trim().length < 6) {
      setLoginError("Please enter the complete 6-digit code.");
      return;
    }
    setIsSubmittingLogin(true);
    try {
      const res = await fetch("/api/admin/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          code: loginPin.trim(),
          challengeId,
          scope: "platform",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.scope === "platform") {
        setIsLocked(false);
        setSession({ authenticated: true, email: loginEmail, scope: "platform" });
        showToast("✓ A.Gure Platform Control unlocked");
      } else {
        setLoginError(data.error || data.message || "Invalid or unauthorized verification code.");
      }
    } catch (_) {
      setLoginError("Verification failed. Please try again.");
    } finally {
      setIsSubmittingLogin(false);
    }
  }

  async function handleLock() {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch (_) {}
    setIsLocked(true);
    setLoginStep("email");
    setLoginPin("");
    showToast("Platform Control locked");
  }

  // Provisioning submit
  async function handleProvisionStudio(e: React.FormEvent) {
    e.preventDefault();
    if (!provSlug.trim() || !provName.trim()) {
      showToast("Studio Name and Slug are required.");
      return;
    }
    try {
      const res = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: provSlug.toLowerCase().trim(),
          name: provName.trim(),
          owner_email: provOwnerEmail.trim(),
          currency: provCurrency,
          ref_prefix: provPrefix.trim().toUpperCase(),
          address: provAddress.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✓ Studio "${provName}" provisioned successfully`);
        setShowProvisionModal(false);
        setProvName("");
        setProvSlug("");
        setProvOwnerEmail("");
        setProvPrefix("");
        setProvAddress("");
        loadPlatformData();
      } else {
        showToast(data.error || "Provisioning failed.");
      }
    } catch (_) {
      showToast("Network error provisioning studio.");
    }
  }

  // Save Branding in Workbench
  async function handleSaveWorkbenchBranding() {
    if (!selectedTenant) return;
    try {
      const res = await fetch(`/api/platform/tenants/${encodeURIComponent(selectedTenant.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branding: {
            monogram: brandingDraft.monogram,
            tagline: brandingDraft.tagline,
            palette: {
              accent: brandingDraft.accent,
              canvas: brandingDraft.canvas,
              card: brandingDraft.card,
            },
            typography: {
              heading: brandingDraft.headingFont,
              body: brandingDraft.bodyFont,
            },
          },
        }),
      });
      if (res.ok) {
        showToast("✓ Studio branding & theme saved");
        loadPlatformData();
      } else {
        showToast("Could not save branding");
      }
    } catch (_) {
      showToast("Network error saving branding");
    }
  }

  // Save Contacts & Routing in Workbench
  async function handleSaveWorkbenchContacts() {
    if (!selectedTenant) return;
    try {
      const res = await fetch(`/api/platform/tenants/${encodeURIComponent(selectedTenant.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactDraft),
      });
      if (res.ok) {
        showToast("✓ Contact details & email routing saved");
        loadPlatformData();
      } else {
        showToast("Could not save contacts");
      }
    } catch (_) {
      showToast("Network error saving contacts");
    }
  }

  // Add Treatment Service in Workbench
  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTenant || !newServiceName.trim()) return;
    try {
      const res = await fetch(`/api/platform/tenants/${encodeURIComponent(selectedTenant.id)}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newServiceName.trim(),
          price: Number(newServicePrice),
          duration_min: Number(newServiceDuration),
          active: true,
        }),
      });
      if (res.ok) {
        showToast("✓ Treatment service added to catalog");
        setNewServiceName("");
        // Reload services
        const r = await fetch(`/api/platform/tenants/${encodeURIComponent(selectedTenant.id)}/services`);
        const d = await r.json();
        if (Array.isArray(d.services)) setServicesList(d.services);
      } else {
        showToast("Could not add service");
      }
    } catch (_) {
      showToast("Network error adding service");
    }
  }

  // Filtered studios
  const filteredStudios = tenants.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      (t.owner_email && t.owner_email.toLowerCase().includes(q))
    );
  });

  // Realtime Studio Preview Cards
  const renderPreviewCards = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Preview 1: Canopy Badge Preview */}
      <div
        className="squircle-card"
        style={{
          backgroundColor: brandingDraft.canvas,
          color: "#FFFFFF",
          padding: "16px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#9CA3AF", marginBottom: "8px" }}>
          1 · Canopy Badge Preview
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "14px",
              backgroundColor: "rgba(255, 255, 255, 0.94)",
              color: "#121214",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display, 'Cinzel', serif)",
              fontWeight: 700,
              fontSize: "1rem",
            }}
          >
            {brandingDraft.monogram || selectedTenant?.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
              {contactDraft.name || selectedTenant?.name}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>
              {brandingDraft.tagline || "Studio Manager"}
            </div>
          </div>
        </div>
      </div>

      {/* Preview 2: Public Booking Card */}
      <div className="squircle-card" style={{ padding: "16px" }}>
        <div style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#71717A", marginBottom: "8px" }}>
          2 · Public Booking Card Preview
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#71717A" }}>
              Signature Session · 60m
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>Single Treatment</div>
          </div>
          <strong style={{ fontSize: "0.9rem" }}>950 {selectedTenant?.currency || "NOK"}</strong>
        </div>
        <button
          type="button"
          className="btn-ny-time"
          style={{
            width: "100%",
            justifyContent: "center",
            marginTop: "12px",
            backgroundColor: brandingDraft.accent,
            color: "#121214",
          }}
        >
          Select Time →
        </button>
      </div>

      {/* Preview 3: Resend Email Header */}
      <div
        className="squircle-card"
        style={{
          backgroundColor: "#F7F4EE",
          borderColor: "#E6E0D6",
          padding: "16px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#71717A", marginBottom: "8px" }}>
          3 · Email Header Preview
        </div>
        <div style={{ fontSize: "0.72rem", color: "#5E5A55", marginBottom: "8px" }}>
          From: <strong>{contactDraft.from_name || selectedTenant?.name} &lt;booking@agure.space&gt;</strong>
        </div>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: "#FFFFFF",
            border: "1px solid #D5CCBF",
            margin: "0 auto 6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display, 'Cinzel', serif)",
            fontWeight: 700,
            color: "#121214",
          }}
        >
          {brandingDraft.monogram || selectedTenant?.name.slice(0, 2).toUpperCase()}
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {contactDraft.name || selectedTenant?.name}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#FAFAFA", display: "flex", flexDirection: "column" }}>
      {/* =================================================================== */}
      {/* 1. PLATFORM SECURITY GATE OVERLAY                                   */}
      {/* =================================================================== */}
      <AnimatePresence>
        {isLocked && (
          <motion.div
            id="platform-login-overlay"
            className="login-gate-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            style={{ display: "flex", zIndex: 2000 }}
          >
            <div className="login-arch-watermark" aria-hidden="true">
              PLATFORM
            </div>

            <div
              id="platform-login-card"
              className="login-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="platform-login-title"
            >
              <div className="login-brand-badge" id="platform-login-badge" aria-hidden="true">
                <span className="login-brand-badge-mark" style={{ opacity: 1 }}>
                  <span style={{ fontFamily: "var(--font-display, 'Cinzel', serif)" }}>AG</span>
                </span>
              </div>

              <h2 id="platform-login-title" className="login-card-title">
                A.Gure Platform Control
              </h2>
              <p id="platform-login-subtitle" className="login-card-subtitle">
                {loginStep === "email" ? "Platform & Multi-Tenant Control Center" : "Enter platform verification code"}
              </p>

              {loginStep === "email" ? (
                <div className="login-step" id="platform-step-email">
                  <form id="platform-email-form" onSubmit={handleSendOtp} noValidate>
                    <input
                      type="email"
                      id="platform-login-email"
                      className="login-gate-input"
                      placeholder="Platform admin email"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        setLoginError("");
                      }}
                      autoComplete="email"
                      required
                    />
                    {loginError && (
                      <div id="platform-email-error" className="login-gate-error" style={{ display: "block" }}>
                        {loginError}
                      </div>
                    )}
                    <button
                      type="submit"
                      id="platform-send-otp-btn"
                      className="login-gate-submit"
                      disabled={isSubmittingLogin}
                    >
                      {isSubmittingLogin ? "Sending code..." : "Send verification code →"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="login-step" id="platform-step-code">
                  <div className="login-code-chip">
                    <span className="login-code-chip-text">
                      Code sent to <strong id="platform-chip-email">{loginEmail}</strong>
                    </span>
                    <button
                      type="button"
                      id="platform-change-email-btn"
                      className="login-code-chip-change"
                      onClick={() => setLoginStep("email")}
                    >
                      Change
                    </button>
                  </div>
                  <form id="platform-code-form" onSubmit={handleVerifyOtp} noValidate>
                    <input
                      type="password"
                      id="platform-pin-input"
                      className="login-gate-input login-gate-pin"
                      maxLength={6}
                      inputMode="numeric"
                      placeholder="• • • • • •"
                      value={loginPin}
                      onChange={(e) => {
                        setLoginPin(e.target.value);
                        setLoginError("");
                      }}
                      autoComplete="one-time-code"
                      required
                    />
                    {loginError && (
                      <div id="platform-code-error" className="login-gate-error" style={{ display: "block" }}>
                        {loginError}
                      </div>
                    )}
                    <button
                      type="submit"
                      id="platform-verify-btn"
                      className="login-gate-submit"
                      disabled={isSubmittingLogin}
                    >
                      {isSubmittingLogin ? "Verifying..." : "Open Platform Control →"}
                    </button>
                  </form>
                  <button
                    type="button"
                    id="platform-resend-btn"
                    className="login-gate-otp"
                    onClick={handleSendOtp}
                    disabled={isSubmittingLogin}
                  >
                    Resend code
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* 2. TOP OBSIDIAN COMMAND HEADER (#121214)                            */}
      {/* =================================================================== */}
      <header
        style={{
          height: "68px",
          backgroundColor: "#121214",
          color: "#FFFFFF",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobileViewport ? "0 14px" : "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Left: Brand / Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "12px",
              backgroundColor: "rgba(255, 255, 255, 0.92)",
              color: "#121214",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display, 'Cinzel', serif)",
              fontWeight: 700,
              fontSize: "0.88rem",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
              flexShrink: 0,
            }}
          >
            AG
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontFamily: "var(--font-display, 'Cinzel', serif)",
                  fontWeight: 700,
                  fontSize: isMobileViewport ? "0.85rem" : "0.95rem",
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedTenant(null)}
              >
                {isMobileViewport ? "AG Platform" : "A.Gure Platform Control"}
              </span>
              {selectedTenant && !isMobileViewport && (
                <>
                  <span style={{ color: "rgba(255, 255, 255, 0.3)" }}>/</span>
                  <span style={{ color: "#C4A482", fontWeight: 700, fontSize: "0.9rem" }}>
                    {selectedTenant.name}
                  </span>
                </>
              )}
            </div>
            {!isMobileViewport && (
              <div style={{ fontSize: "0.68rem", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Agency Multi-Tenant Engine
              </div>
            )}
          </div>
        </div>

        {/* Center: Filter Bar & View Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobileViewport ? "6px" : "14px" }}>
          {!selectedTenant && !isMobileViewport && (
            <input
              type="text"
              placeholder="Quick jump to studio, domain, or setting... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "280px",
                padding: "8px 14px",
                borderRadius: "9999px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                color: "#FFFFFF",
                fontSize: "0.8rem",
                outline: "none",
              }}
            />
          )}

          <div
            style={{
              display: "flex",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              borderRadius: "9999px",
              padding: "3px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setTopView("matrix");
                setSelectedTenant(null);
              }}
              style={{
                background: topView === "matrix" && !selectedTenant ? "#C4A482" : "transparent",
                color: topView === "matrix" && !selectedTenant ? "#121214" : "#FFFFFF",
                border: "none",
                borderRadius: "9999px",
                padding: isMobileViewport ? "5px 10px" : "6px 14px",
                fontSize: isMobileViewport ? "0.72rem" : "0.76rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {isMobileViewport ? "Matrix" : "Studios Matrix"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTopView("audit");
                setSelectedTenant(null);
              }}
              style={{
                background: topView === "audit" ? "#C4A482" : "transparent",
                color: topView === "audit" ? "#121214" : "#FFFFFF",
                border: "none",
                borderRadius: "9999px",
                padding: isMobileViewport ? "5px 10px" : "6px 14px",
                fontSize: isMobileViewport ? "0.72rem" : "0.76rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {isMobileViewport ? "Audit" : "Global Audit Log"}
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            id="btn-provision-studio"
            className="btn-ny-time"
            style={{
              backgroundColor: "#C4A482",
              color: "#121214",
              fontWeight: 700,
              fontSize: isMobileViewport ? "0.74rem" : "0.78rem",
              padding: isMobileViewport ? "7px 12px" : "8px 16px",
            }}
            onClick={() => setShowProvisionModal(true)}
          >
            {isMobileViewport ? "+ Studio" : "+ Provision New Studio"}
          </button>
          <button
            type="button"
            className="canopy-lock-btn"
            id="platform-lock-btn"
            title="Lock Platform Control"
            onClick={handleLock}
          >
            🔒
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* 3. MAIN WORKSPACE CONTAINER                                         */}
      {/* =================================================================== */}
      <main style={{ flex: 1, padding: isMobileViewport ? "14px 14px 84px" : "24px 32px", maxWidth: "1480px", margin: "0 auto", width: "100%" }}>
        {/* ----------------------------------------------------------------- */}
        {/* MODE A: THE STUDIO MATRIX & EXECUTIVE OVERVIEW                    */}
        {/* ----------------------------------------------------------------- */}
        {!selectedTenant && topView === "matrix" && (
          <div>
            {/* Top Display Header (Inspo 1: "Your Projects (4)" -> "Your Studios (3)") */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.8rem", color: "#71717A", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  A.Gure Agency Platform
                </span>
                <span className="status-pill-badge confirmed" style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "9999px" }}>
                  ● {filteredStudios.length} STUDIOS LIVE
                </span>
              </div>
              <h1
                style={{
                  fontSize: isMobileViewport ? "2.1rem" : "2.6rem",
                  fontWeight: 800,
                  margin: "0 0 6px",
                  letterSpacing: "-0.03em",
                  color: "#121214",
                  lineHeight: 1.1,
                }}
              >
                Your Studios ({filteredStudios.length})
              </h1>
              <p style={{ fontSize: "0.88rem", color: "#71717A", margin: 0 }}>
                Isolated multi-tenant engine · Tap any studio card to configure branding, routing & services
              </p>
            </div>

            {/* STUDIO BENTO CARDS (Inspo 1 & 2 Soft Pastel Cards) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobileViewport ? "1fr" : "repeat(auto-fill, minmax(340px, 1fr))",
                gap: "16px",
                marginBottom: "28px",
              }}
            >
              {filteredStudios.map((t, idx) => {
                const theme = getStudioTheme(t.id, idx);
                const mono = t.branding?.monogram || t.name.slice(0, 2).toUpperCase();
                const logo = t.branding?.assets?.logo_url || t.logo_url;

                return (
                  <motion.div
                    key={t.id}
                    whileHover={{ y: -4, transition: { duration: 0.18 } }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectStudio(t)}
                    className="platform-studio-folio-card"
                    style={{
                      backgroundColor: theme.bg,
                      border: `1px solid ${theme.border}`,
                      boxShadow: "0 6px 24px rgba(0, 0, 0, 0.04)",
                    }}
                  >
                    {/* Top Folio Metadata Bar: Monogram Seal + Spaced Folio Tag + Status Seal */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            backgroundColor: theme.canopy,
                            color: theme.accent,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "0.95rem",
                            fontFamily: "var(--font-display, 'Cinzel', serif)",
                            boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                            border: `1.5px solid ${theme.accent}`,
                            flexShrink: 0,
                          }}
                        >
                          {logo ? (
                            <img
                              src={logo}
                              alt={t.name}
                              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "contain", background: "#fff" }}
                            />
                          ) : (
                            mono
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: theme.sub, fontFamily: "monospace" }}>
                              № {t.ref_prefix || "STU"}
                            </span>
                            <span style={{ color: "rgba(0,0,0,0.2)" }}>•</span>
                            <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: theme.accent, overflow: "hidden", textOverflow: "ellipsis" }}>
                              {theme.folioName}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.74rem", fontWeight: 600, color: theme.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "1px" }}>
                            {t.id}.agure.space
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        <span className="status-seal-pill confirmed" style={{ padding: "3px 8px", fontSize: "0.64rem" }}>
                          <span className="status-seal-dot" />
                          LIVE
                        </span>
                        <a
                          href={`/admin?tenant=${encodeURIComponent(t.id)}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Open live client admin portal"
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            border: `1px solid ${theme.border}`,
                            backgroundColor: "rgba(255,255,255,0.85)",
                            color: theme.text,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textDecoration: "none",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                          }}
                        >
                          ↗
                        </a>
                      </div>
                    </div>

                    {/* Perforated Deckle Tear Line */}
                    <div className="atelier-ticket-tear" style={{ margin: "14px -22px" }}>
                      <div className="atelier-ticket-dashed-line" style={{ borderColor: theme.border }} />
                    </div>

                    {/* Middle: Studio Name & Tagline */}
                    <div style={{ margin: "2px 0 14px" }}>
                      <h3
                        style={{
                          fontSize: isMobileViewport ? "1.45rem" : "1.6rem",
                          fontWeight: 800,
                          margin: 0,
                          lineHeight: 1.15,
                          letterSpacing: "-0.025em",
                          color: theme.text,
                        }}
                      >
                        {t.name}
                      </h3>
                      <div style={{ fontSize: "0.78rem", color: theme.sub, marginTop: "4px", fontWeight: 500 }}>
                        {t.branding?.tagline || `Luxury studio booking engine · ${theme.year} Archive`}
                      </div>
                    </div>

                    {/* Bottom Row: Owner Monogram + Treatments Pill + Tactile Folio Action */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", paddingTop: "8px", borderTop: `1px solid ${theme.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "26px",
                            height: "26px",
                            borderRadius: "50%",
                            backgroundColor: theme.canopy,
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.64rem",
                            fontWeight: 700,
                            border: "1.5px solid #FFFFFF",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                          }}
                        >
                          {(t.owner_email || "AD").slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.sub }}>
                          {t.service_count || 3} treatments
                        </span>
                      </div>

                      <div
                        style={{
                          backgroundColor: theme.surface,
                          color: theme.text,
                          padding: "5px 12px",
                          borderRadius: "9999px",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          border: `1px solid ${theme.border}`,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        <span>Studio Folio</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* INSPERATION 2: AGENCY OVERVIEW METRIC TILES */}
            <div style={{ marginTop: "12px", marginBottom: "28px" }}>
              <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#71717A", fontWeight: 700, marginBottom: "12px" }}>
                Platform Pulse & Architecture
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobileViewport ? "1fr 1fr" : "repeat(4, 1fr)",
                  gap: "12px",
                }}
              >
                {/* Tile 1: Studios */}
                <div className="platform-pulse-tile" style={{ borderLeft: "3.5px solid #C4A482" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="platform-pulse-label">Studios</span>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10B981", boxShadow: "0 0 0 2px rgba(16,185,129,0.2)" }} />
                  </div>
                  <div className="platform-pulse-val">
                    {tenants.filter((t) => t.active !== false).length}
                  </div>
                  <div className="platform-pulse-sub">Multi-tenant active</div>
                </div>

                {/* Tile 2: Domains */}
                <div className="platform-pulse-tile" style={{ borderLeft: "3.5px solid #7E9F85" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="platform-pulse-label">Domains</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7E9F85" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div className="platform-pulse-val">
                    {tenants.reduce((acc, t) => acc + (t.domain_count || 1), 0)}
                  </div>
                  <div className="platform-pulse-sub">CORS & SSL verified</div>
                </div>

                {/* Tile 3: Services */}
                <div className="platform-pulse-tile" style={{ borderLeft: "3.5px solid #9285B4" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="platform-pulse-label">Catalog</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9285B4" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div className="platform-pulse-val">
                    {tenants.reduce((acc, t) => acc + (t.service_count || 3), 0)}
                  </div>
                  <div className="platform-pulse-sub">Active treatments</div>
                </div>

                {/* Tile 4: Audit */}
                <div className="platform-pulse-tile" style={{ borderLeft: "3.5px solid #C86D51" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="platform-pulse-label">Audit Log</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C86D51" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <div className="platform-pulse-val">
                    {auditEvents.length || 8}
                  </div>
                  <div className="platform-pulse-sub">Security events</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* MODE B: FULL-WORKSPACE STUDIO WORKBENCH (Inspo 1 Screen 2)        */}
        {/* ----------------------------------------------------------------- */}
        {selectedTenant && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{ width: "100%" }}
          >
            {/* Top Navigation & Action Row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={() => setSelectedTenant(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "9999px",
                  border: "1px solid rgba(0,0,0,0.12)",
                  backgroundColor: "#FFFFFF",
                  color: "#121214",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ← All Studios
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <a
                  href={`/admin?tenant=${encodeURIComponent(selectedTenant.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "9999px",
                    backgroundColor: "#121214",
                    color: "#FFFFFF",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Live Portal ↗
                </a>
              </div>
            </div>

            {/* Inspo 1 Screen 2 Header: "Planning" -> Studio Name */}
            <div style={{ marginBottom: "20px" }}>
              <span style={{ fontSize: "0.8rem", color: "#71717A", fontWeight: 600 }}>
                Studio Master Workbench
              </span>
              <h1
                style={{
                  fontSize: isMobileViewport ? "2.2rem" : "2.8rem",
                  fontWeight: 800,
                  margin: "4px 0",
                  letterSpacing: "-0.03em",
                  color: "#121214",
                  lineHeight: 1.1,
                }}
              >
                {selectedTenant.name}
              </h1>
              <div style={{ fontSize: "0.85rem", color: "#71717A" }}>
                Multi-Tenant Slug: <strong>{selectedTenant.id}</strong> · Ref: <strong>{selectedTenant.ref_prefix || "STU"}</strong>
              </div>
            </div>

            {/* Inspo 1 Screen 2: Top Bento Feature Row (Black Stat Tile + Soft Domain Share Tile) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobileViewport ? "1fr" : "180px 1fr",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              {/* Tile 1: Black Obsidian Stat Tile */}
              <div
                style={{
                  backgroundColor: "#121214",
                  color: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "100px",
                }}
              >
                <div style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#C4A482", fontWeight: 700, letterSpacing: "0.06em" }}>
                  Services Catalog
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1 }}>
                  {servicesList.length || selectedTenant.service_count || 3}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Active treatments</div>
              </div>

              {/* Tile 2: Soft Pastel Domain & Share Tile */}
              <div
                style={{
                  backgroundColor: getStudioTheme(selectedTenant.id, 0).bg,
                  color: getStudioTheme(selectedTenant.id, 0).text,
                  borderRadius: "24px",
                  padding: "18px 22px",
                  border: `1px solid ${getStudioTheme(selectedTenant.id, 0).border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700, opacity: 0.75, letterSpacing: "0.06em" }}>
                    Production Domain
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, marginTop: "2px" }}>
                    {selectedTenant.id}.agure.space
                  </div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.8, marginTop: "2px" }}>
                    Owner: {selectedTenant.owner_email || "admin@agure.space"}
                  </div>
                </div>

                <a
                  href={`/admin?tenant=${encodeURIComponent(selectedTenant.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    backgroundColor: "#121214",
                    color: "#FFFFFF",
                    padding: "9px 18px",
                    borderRadius: "9999px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  <span>Share Portal Link</span>
                </a>
              </div>
            </div>

            {/* Horizontal Folio Tab Strip (No Emojis) */}
            <div
              style={{
                display: "flex",
                overflowX: "auto",
                gap: "8px",
                paddingBottom: "12px",
                marginBottom: "16px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {[
                {
                  id: "branding",
                  label: "Branding & Palette",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
                      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                    </svg>
                  ),
                },
                {
                  id: "contacts",
                  label: "Contacts & Sender",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  ),
                },
                {
                  id: "catalog",
                  label: "Services Catalog",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  ),
                },
                {
                  id: "access",
                  label: "Domains & Access",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  ),
                },
                {
                  id: "audit",
                  label: "Audit Ledger",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  ),
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveWorkbenchTab(tab.id as any)}
                  className="platform-tab-btn"
                  style={{
                    padding: "9px 18px",
                    borderRadius: "9999px",
                    border: "1px solid",
                    borderColor: activeWorkbenchTab === tab.id ? "#121214" : "rgba(0,0,0,0.1)",
                    backgroundColor: activeWorkbenchTab === tab.id ? "#121214" : "#FFFFFF",
                    color: activeWorkbenchTab === tab.id ? "#FFFFFF" : "#52525B",
                    fontSize: "0.80rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Center Canvas + Preview Container */}
            <div
              style={{
                display: "flex",
                flexDirection: isMobileViewport ? "column" : "row",
                gap: "20px",
                alignItems: "flex-start",
                width: "100%",
              }}
            >
              {/* Form Canvas */}
              <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
              {/* TAB 1: BRANDING & ASSETS */}
              {activeWorkbenchTab === "branding" && (
                <div className="squircle-card">
                  <div className="card-section-head">
                    <div>
                      <h3 className="card-title-main">Studio Branding & Visual Assets</h3>
                      <span className="card-subtitle">Dropzones for high-resolution marks and color palette</span>
                    </div>
                  </div>

                  {/* 4 Physical Asset Dropzone Plaques */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
                    {[
                      { key: "logo", label: "Studio Logo (Header & Badge)", hint: "Dark or light vector / PNG · 512×512", currentUrl: selectedTenant.branding?.assets?.logo_url || selectedTenant.logo_url },
                      { key: "favicon", label: "Favicon (Browser Tab)", hint: "Square icon · 32×32 or 64×64 PNG", currentUrl: selectedTenant.branding?.assets?.favicon_url },
                      { key: "watermark", label: "Canopy Watermark Mark", hint: "Faint background brand calligraphy · SVG/PNG", currentUrl: selectedTenant.branding?.assets?.watermark_url },
                      { key: "hero", label: "Hero Banner Art", hint: "Landscape luxury studio photography", currentUrl: selectedTenant.branding?.assets?.hero_url },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="platform-asset-plaque"
                        style={{
                          border: "1px solid rgba(0, 0, 0, 0.08)",
                          borderRadius: "16px",
                          padding: "16px",
                          backgroundColor: "#FFFFFF",
                          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.02)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#111827" }}>{item.label}</span>
                            {item.currentUrl && (
                              <span style={{ fontSize: "0.64rem", fontWeight: 700, textTransform: "uppercase", color: "#059669", background: "#ECFDF5", padding: "2px 6px", borderRadius: "4px" }}>
                                Active
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "#71717A", marginBottom: "12px" }}>{item.hint}</div>

                          {item.currentUrl ? (
                            <div style={{ height: "64px", borderRadius: "10px", background: "#F4F4F5", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: "12px", border: "1px solid rgba(0,0,0,0.06)" }}>
                              <img src={item.currentUrl} alt={item.label} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                            </div>
                          ) : (
                            <div style={{ height: "64px", borderRadius: "10px", border: "1.5px dashed #E4E4E7", display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A1AA", fontSize: "0.72rem", marginBottom: "12px" }}>
                              No asset configured
                            </div>
                          )}
                        </div>

                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            padding: "7px 12px",
                            borderRadius: "8px",
                            backgroundColor: "#F4F4F5",
                            color: "#18181B",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            border: "1px solid rgba(0,0,0,0.06)",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span>Upload {item.label.split(" ")[0]}</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const fd = new FormData();
                              fd.append("file", file);
                              fd.append("kind", item.key);
                              try {
                                const res = await fetch(
                                  `/api/platform/tenants/${encodeURIComponent(selectedTenant.id)}/assets`,
                                  {
                                    method: "POST",
                                    body: fd,
                                  }
                                );
                                if (res.ok) {
                                  showToast(`✓ ${item.label} updated`);
                                  loadPlatformData();
                                } else {
                                  showToast("Upload failed");
                                }
                              } catch (_) {
                                showToast("Network error during upload");
                              }
                            }}
                          />
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Palette Controls */}
                  <div className="modal-section-title">Surface & Accent Palette</div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobileViewport ? "1fr" : "1fr 1fr 1fr", gap: "14px" }}>
                    <div className="recessed-input-group">
                      <label className="recessed-label">Primary Accent</label>
                      <input
                        type="text"
                        className="recessed-input"
                        value={brandingDraft.accent}
                        onChange={(e) => setBrandingDraft({ ...brandingDraft, accent: e.target.value })}
                      />
                    </div>
                    <div className="recessed-input-group">
                      <label className="recessed-label">Dark Canopy Background</label>
                      <input
                        type="text"
                        className="recessed-input"
                        value={brandingDraft.canvas}
                        onChange={(e) => setBrandingDraft({ ...brandingDraft, canvas: e.target.value })}
                      />
                    </div>
                    <div className="recessed-input-group">
                      <label className="recessed-label">Dark Card Surface</label>
                      <input
                        type="text"
                        className="recessed-input"
                        value={brandingDraft.card}
                        onChange={(e) => setBrandingDraft({ ...brandingDraft, card: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Typography & Identity */}
                  <div className="modal-grid-2">
                    <div className="recessed-input-group">
                      <label className="recessed-label">Studio Monogram (Fallback)</label>
                      <input
                        type="text"
                        className="recessed-input"
                        maxLength={3}
                        value={brandingDraft.monogram}
                        onChange={(e) => setBrandingDraft({ ...brandingDraft, monogram: e.target.value })}
                      />
                    </div>
                    <div className="recessed-input-group">
                      <label className="recessed-label">Tagline Subtitle</label>
                      <input
                        type="text"
                        className="recessed-input"
                        value={brandingDraft.tagline}
                        onChange={(e) => setBrandingDraft({ ...brandingDraft, tagline: e.target.value })}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-ny-time"
                    style={{ width: "100%", justifyContent: "center", marginTop: "16px", padding: "12px" }}
                    onClick={handleSaveWorkbenchBranding}
                  >
                    Save Branding & Visual Identity
                  </button>
                </div>
              )}

              {/* TAB 2: CONTACTS & ROUTING */}
              {activeWorkbenchTab === "contacts" && (
                <div className="squircle-card">
                  <div className="card-section-head">
                    <div>
                      <h3 className="card-title-main">Customer Contacts & Email Routing</h3>
                      <span className="card-subtitle">Clean separation of public contact info vs internal routing</span>
                    </div>
                  </div>

                  <div className="modal-section-title">Public Customer Contact Information</div>
                  <div className="modal-grid-2">
                    <div className="recessed-input-group">
                      <label className="recessed-label">Studio Display Name</label>
                      <input
                        type="text"
                        className="recessed-input"
                        value={contactDraft.name}
                        onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })}
                      />
                    </div>
                    <div className="recessed-input-group">
                      <label className="recessed-label">Public Contact Email</label>
                      <input
                        type="email"
                        className="recessed-input"
                        value={contactDraft.contact_email}
                        onChange={(e) => setContactDraft({ ...contactDraft, contact_email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="modal-grid-2">
                    <div className="recessed-input-group">
                      <label className="recessed-label">Phone Number</label>
                      <input
                        type="tel"
                        className="recessed-input"
                        value={contactDraft.phone}
                        onChange={(e) => setContactDraft({ ...contactDraft, phone: e.target.value })}
                      />
                    </div>
                    <div className="recessed-input-group">
                      <label className="recessed-label">WhatsApp Direct Number</label>
                      <input
                        type="tel"
                        className="recessed-input"
                        value={contactDraft.whatsapp}
                        onChange={(e) => setContactDraft({ ...contactDraft, whatsapp: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="modal-grid-2">
                    <div className="recessed-input-group">
                      <label className="recessed-label">Street Address</label>
                      <input
                        type="text"
                        className="recessed-input"
                        value={contactDraft.address}
                        onChange={(e) => setContactDraft({ ...contactDraft, address: e.target.value })}
                      />
                    </div>
                    <div className="recessed-input-group">
                      <label className="recessed-label">Org / Tax Number</label>
                      <input
                        type="text"
                        className="recessed-input"
                        value={contactDraft.org_number}
                        onChange={(e) => setContactDraft({ ...contactDraft, org_number: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="modal-section-title" style={{ marginTop: "16px" }}>
                    Private Transactional Email Routing
                  </div>
                  <div className="modal-grid-2">
                    <div className="recessed-input-group">
                      <label className="recessed-label">Owner Email (Private)</label>
                      <input
                        type="email"
                        className="recessed-input"
                        value={contactDraft.owner_email}
                        onChange={(e) => setContactDraft({ ...contactDraft, owner_email: e.target.value })}
                      />
                    </div>
                    <div className="recessed-input-group">
                      <label className="recessed-label">Sender From Name</label>
                      <input
                        type="text"
                        className="recessed-input"
                        value={contactDraft.from_name}
                        onChange={(e) => setContactDraft({ ...contactDraft, from_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="recessed-input-group">
                    <label className="recessed-label">Transactional Reply-To Address</label>
                    <input
                      type="email"
                      className="recessed-input"
                      value={contactDraft.reply_to}
                      onChange={(e) => setContactDraft({ ...contactDraft, reply_to: e.target.value })}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-ny-time"
                    style={{ width: "100%", justifyContent: "center", marginTop: "16px", padding: "12px" }}
                    onClick={handleSaveWorkbenchContacts}
                  >
                    Save Contacts & Email Routing
                  </button>
                </div>
              )}

              {/* TAB 3: SERVICES & CATALOG */}
              {activeWorkbenchTab === "catalog" && (
                <div className="squircle-card">
                  <div className="card-section-head">
                    <div>
                      <h3 className="card-title-main">Treatment Services Catalog</h3>
                      <span className="card-subtitle">Manage customer-facing service offerings and prices</span>
                    </div>
                  </div>

                  <form
                    onSubmit={handleAddService}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobileViewport ? "1fr" : "2fr 1fr 1fr auto",
                      gap: "10px",
                      marginBottom: "16px",
                      alignItems: "flex-end",
                    }}
                  >
                    <div>
                      <label className="recessed-label">Service Title</label>
                      <input
                        type="text"
                        className="recessed-input"
                        placeholder="Signature Session"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="recessed-label">Price (NOK)</label>
                      <input
                        type="number"
                        className="recessed-input"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="recessed-label">Duration (min)</label>
                      <input
                        type="number"
                        className="recessed-input"
                        value={newServiceDuration}
                        onChange={(e) => setNewServiceDuration(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="btn-ny-time" style={{ padding: "11px 16px" }}>
                      + Add
                    </button>
                  </form>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
                    {servicesList.length === 0 ? (
                      <p style={{ fontSize: "0.82rem", color: "#71717A" }}>No services in catalog yet.</p>
                    ) : (
                      servicesList.map((s, idx) => {
                        const glyph = /gold|gem|crystal|tooth/i.test(s.name)
                          ? "💎"
                          : /silver|cap|grill/i.test(s.name)
                          ? "🪙"
                          : /clean|spa|scrub/i.test(s.name)
                          ? "🧴"
                          : "🪞";
                        return (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "14px 18px",
                              backgroundColor: "#FFFFFF",
                              borderRadius: "18px",
                              border: "1px solid rgba(0, 0, 0, 0.08)",
                              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
                              gap: "12px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <span
                                style={{
                                  width: "38px",
                                  height: "38px",
                                  borderRadius: "12px",
                                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "1.1rem",
                                  flexShrink: 0,
                                }}
                              >
                                {glyph}
                              </span>
                              <div>
                                <strong style={{ fontSize: "0.92rem", color: "#111827", display: "block" }}>
                                  {s.name}
                                </strong>
                                <span style={{ fontSize: "0.76rem", color: "#6B7280" }}>
                                  {s.duration_min} min · {s.price} NOK
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "4px 10px",
                                  borderRadius: "999px",
                                  backgroundColor: s.active !== false ? "#ECFDF5" : "#F3F4F6",
                                  color: s.active !== false ? "#065F46" : "#6B7280",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                }}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: s.active !== false ? "#10B981" : "#9CA3AF",
                                  }}
                                />
                                {s.active !== false ? "Active" : "Paused"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ADMINS & DOMAINS */}
              {activeWorkbenchTab === "access" && (
                <div className="squircle-card">
                  <div className="card-section-head">
                    <div>
                      <h3 className="card-title-main">Admins, Access & Production Domains</h3>
                      <span className="card-subtitle">Authorized owners, team logins, and allowed origins</span>
                    </div>
                  </div>

                  <div className="modal-section-title">Studio Owner</div>
                  <div className="modal-detail-row">
                    <span className="modal-detail-label">Primary Account</span>
                    <strong>{selectedTenant.owner_email || "Not configured"}</strong>
                  </div>

                  <div className="modal-section-title" style={{ marginTop: "16px" }}>
                    Connected Domains & Origins
                  </div>
                  <div className="modal-detail-row">
                    <span className="modal-detail-label">Production Domain</span>
                    <strong>{selectedTenant.id}.agure.space</strong>
                  </div>
                  <div className="modal-detail-row">
                    <span className="modal-detail-label">Tenant API Namespace</span>
                    <strong>/api/v1/t/{selectedTenant.id}/*</strong>
                  </div>
                </div>
              )}

              {/* TAB 5: STUDIO AUDIT LOG */}
              {activeWorkbenchTab === "audit" && (
                <div className="squircle-card">
                  <div className="card-section-head">
                    <div>
                      <h3 className="card-title-main">Studio Audit Trail</h3>
                      <span className="card-subtitle">Mutations and administrative events for {selectedTenant.name}</span>
                    </div>
                  </div>

                  <div className="activity-list">
                    {auditEvents
                      .filter((ev) => ev.tenant_id === selectedTenant.id)
                      .map((ev, idx) => (
                        <div key={idx} className="activity-row">
                          <span className="activity-action">{ev.action}</span>
                          <span className="activity-time">
                            {new Date(ev.created_at).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="activity-meta">Actor: {ev.actor_email || "system"}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Right Sticky Live Preview Rail (Desktop Only) */}
            {!isMobileViewport && (
              <aside
                style={{
                  width: "360px",
                  flexShrink: 0,
                  position: "sticky",
                  top: "92px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Live Visual Preview
                </div>
                {renderPreviewCards()}
              </aside>
            )}
          </div>
        </motion.div>
        )}

        {/* Floating Mobile Preview Pill Button */}
        {isMobileViewport && selectedTenant && (
          <div
            style={{
              position: "fixed",
              bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 900,
            }}
          >
            <button
              type="button"
              onClick={() => setShowMobilePreviewModal(true)}
              style={{
                backgroundColor: "#121214",
                color: "#FFFFFF",
                border: "1px solid #C4A482",
                padding: "10px 22px",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.03em",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>Preview Studio Live</span>
            </button>
          </div>
        )}

        {/* Mobile Realtime Preview Bottom Sheet (Slide-Up & Swipe Down to Dismiss) */}
        <AnimatePresence>
          {isMobileViewport && showMobilePreviewModal && selectedTenant && (
            <div className="modal-backdrop open" id="modal-mobile-preview" style={{ zIndex: 1100 }}>
              <motion.div
                className="modal-sheet"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0, bottom: 0.25 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 90 || info.velocity.y > 250) {
                    setShowMobilePreviewModal(false);
                  }
                }}
                style={{ maxHeight: "85vh", overflowY: "auto" }}
              >
                <div className="modal-top-handle" onClick={() => setShowMobilePreviewModal(false)} />
                <div className="modal-sheet-head">
                  <div>
                    <h3 className="modal-sheet-title">Realtime Studio Preview</h3>
                    <span className="modal-sheet-subtitle">
                      {selectedTenant.name} ({selectedTenant.id})
                    </span>
                  </div>
                  <button
                    type="button"
                    className="modal-sheet-close"
                    onClick={() => setShowMobilePreviewModal(false)}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ marginTop: "16px" }}>{renderPreviewCards()}</div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ----------------------------------------------------------------- */}
        {/* GLOBAL AUDIT LOG VIEW                                             */}
        {/* ----------------------------------------------------------------- */}
        {topView === "audit" && !selectedTenant && (
          <div className="squircle-card">
            <div className="card-section-head">
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>Platform Audit Trail</h2>
                <span className="card-subtitle">Cross-tenant administrative mutations and security events</span>
              </div>
              <button
                type="button"
                className="quick-action-btn"
                style={{ padding: "8px 14px" }}
                onClick={loadPlatformData}
              >
                ↻ Refresh
              </button>
            </div>

            <div className="activity-list">
              {auditEvents.length === 0 ? (
                <p className="activity-empty">No platform events logged yet.</p>
              ) : (
                auditEvents.map((ev) => (
                  <div key={ev.id} className="activity-row">
                    <span className="activity-action">
                      [{ev.tenant_id}] {ev.action}
                    </span>
                    <span className="activity-time">
                      {new Date(ev.created_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="activity-meta">
                      Actor: {ev.actor_email || "system"}{" "}
                      {ev.booking_ref && `· Ref: ${ev.booking_ref}`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* 4. PROVISION NEW STUDIO MODAL                                       */}
      {/* =================================================================== */}
      <AnimatePresence>
        {showProvisionModal && (
          <div className="modal-backdrop open" id="modal-provision-studio" style={{ zIndex: 1100 }}>
            <motion.div
              className="modal-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.25 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 250) {
                  setShowProvisionModal(false);
                }
              }}
            >
              <div className="modal-top-handle" onClick={() => setShowProvisionModal(false)} />
              <div className="modal-sheet-head">
                <div>
                  <h3 className="modal-sheet-title">Provision New Studio</h3>
                  <span className="modal-sheet-subtitle">Create a new isolated studio tenant</span>
                </div>
                <button
                  type="button"
                  className="modal-sheet-close"
                  onClick={() => setShowProvisionModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleProvisionStudio}>
                <div className="modal-grid-2">
                  <div className="recessed-input-group">
                    <label className="recessed-label">Studio Name</label>
                    <input
                      type="text"
                      className="recessed-input"
                      placeholder="Atelier Oslo"
                      value={provName}
                      onChange={(e) => {
                        setProvName(e.target.value);
                        if (!provSlug) {
                          setProvSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                        }
                      }}
                      required
                    />
                  </div>
                  <div className="recessed-input-group">
                    <label className="recessed-label">Slug Identifier</label>
                    <input
                      type="text"
                      className="recessed-input"
                      placeholder="atelier-oslo"
                      value={provSlug}
                      onChange={(e) => setProvSlug(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="recessed-input-group">
                  <label className="recessed-label">Owner Email</label>
                  <input
                    type="email"
                    className="recessed-input"
                    placeholder="owner@studio.com"
                    value={provOwnerEmail}
                    onChange={(e) => setProvOwnerEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-grid-2">
                  <div className="recessed-input-group">
                    <label className="recessed-label">Currency</label>
                    <select
                      className="recessed-input"
                      value={provCurrency}
                      onChange={(e) => setProvCurrency(e.target.value)}
                    >
                      <option value="NOK">NOK (kr)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div className="recessed-input-group">
                    <label className="recessed-label">Ref Prefix (max 4 chars)</label>
                    <input
                      type="text"
                      className="recessed-input"
                      maxLength={4}
                      placeholder="ATO"
                      value={provPrefix}
                      onChange={(e) => setProvPrefix(e.target.value)}
                    />
                  </div>
                </div>

                <div className="recessed-input-group">
                  <label className="recessed-label">Street Address</label>
                  <input
                    type="text"
                    className="recessed-input"
                    placeholder="Karl Johans gate 10, Oslo"
                    value={provAddress}
                    onChange={(e) => setProvAddress(e.target.value)}
                  />
                </div>

                <button type="submit" className="modal-submit-btn modal-submit-block">
                  Provision Studio Instance
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Alert Box */}
      {toastMessage && (
        <div className="admin-toast-box show" id="admin-toast">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
