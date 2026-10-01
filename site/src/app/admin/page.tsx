"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import { getTenantConfig } from "@/config/tenants";
import { ClientDrawer, type AdminBooking } from "@/components/admin/ClientDrawer";
import { RescheduleModal } from "@/components/admin/RescheduleModal";
import { ManualBookingModal } from "@/components/admin/ManualBookingModal";
import { YinYangWave } from "@/components/ui/YinYangWave";

type TenantRow = Database["public"]["Tables"]["tenants"]["Row"];
type BlackoutRow = Database["public"]["Tables"]["blackouts"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type HourRow = Database["public"]["Tables"]["hours"]["Row"];

const NO_WEEKDAY_INITIALS = ["S", "M", "T", "O", "T", "F", "L"];
const NO_MONTH_NAMES = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
];

function formatDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getOsloDateString(epochSeconds: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(epochSeconds * 1000));
}

function formatOsloDateTime(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleString("no-NO", {
    timeZone: "Europe/Oslo",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOsloDate(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleDateString("no-NO", {
    timeZone: "Europe/Oslo",
    day: "numeric",
    month: "short",
  });
}

function formatOsloTime(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleTimeString("no-NO", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const WEEKDAYS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

function AdminPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get("tenant") || "gangina";
  const activePreset = getTenantConfig(tenantSlug);

  const [currentTenant, setCurrentTenant] = useState<string>("gangina");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantRow | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [blackouts, setBlackouts] = useState<BlackoutRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Active Tab: "appointments" | "schedule" | "settings"
  const [activeTab, setActiveTab] = useState<"appointments" | "schedule" | "settings">("appointments");

  // Status Filter: "all" | "pending" | "confirmed" | "past" - defaults to "all" so no date-range or status filter hides pending bookings
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed" | "past">("all");

  // Modals & Drawers state
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<AdminBooking | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  // Dagsagenda (Yin-Yang timeline) state
  const [timelineDate, setTimelineDate] = useState<string>(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Oslo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  });

  const [timelineWeekStart, setTimelineWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Oslo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }, []);

  const timelineDaysInStrip = useMemo(() => {
    const days: { dateStr: string; weekdayInitial: string; dayNum: number; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(timelineWeekStart);
      cur.setDate(timelineWeekStart.getDate() + i);
      const dateStr = formatDateString(cur);
      days.push({
        dateStr,
        weekdayInitial: NO_WEEKDAY_INITIALS[cur.getDay()],
        dayNum: cur.getDate(),
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [timelineWeekStart, todayStr]);

  const timelineBookings = useMemo(() => {
    return bookings
      .filter((b) => getOsloDateString(b.start_utc) === timelineDate)
      .sort((a, b) => a.start_utc - b.start_utc);
  }, [bookings, timelineDate]);

  const handlePrevWeek = () => {
    const next = new Date(timelineWeekStart);
    next.setDate(next.getDate() - 7);
    setTimelineWeekStart(next);
  };

  const handleNextWeek = () => {
    const next = new Date(timelineWeekStart);
    next.setDate(next.getDate() + 7);
    setTimelineWeekStart(next);
  };

  const curMonthIdx = timelineWeekStart.getMonth();
  const prevMonthName = NO_MONTH_NAMES[(curMonthIdx + 11) % 12];
  const currentMonthName = NO_MONTH_NAMES[curMonthIdx];
  const nextMonthName = NO_MONTH_NAMES[(curMonthIdx + 1) % 12];
  const currentYear = timelineWeekStart.getFullYear();

  const selectedDateTitle = useMemo(() => {
    if (!timelineDate) return "";
    const parts = timelineDate.split("-");
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString("no-NO", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, [timelineDate]);

  // Tab 2: Working Hours state
  const [weeklyHours, setWeeklyHours] = useState<{ weekday: number; enabled: boolean; open: string; close: string }[]>([
    { weekday: 0, enabled: true, open: "10:00", close: "18:00" },
    { weekday: 1, enabled: true, open: "10:00", close: "18:00" },
    { weekday: 2, enabled: true, open: "10:00", close: "18:00" },
    { weekday: 3, enabled: true, open: "10:00", close: "18:00" },
    { weekday: 4, enabled: true, open: "10:00", close: "18:00" },
    { weekday: 5, enabled: true, open: "10:00", close: "18:00" },
    { weekday: 6, enabled: false, open: "10:00", close: "18:00" },
  ]);
  const [slotStepMin, setSlotStepMin] = useState(15);
  const [savingHours, setSavingHours] = useState(false);
  const [saveScheduleStatus, setSaveScheduleStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveScheduleMessage, setSaveScheduleMessage] = useState<string>("");

  // Blackouts form
  const [showBlackoutModal, setShowBlackoutModal] = useState(false);
  const [blackoutStart, setBlackoutStart] = useState("");
  const [blackoutEnd, setBlackoutEnd] = useState("");
  const [blackoutReason, setBlackoutReason] = useState("Pause");
  const [blackoutSubmitting, setBlackoutSubmitting] = useState(false);

  // Tab 3: Settings state
  const [studioName, setStudioName] = useState(activePreset.name);
  const [contactEmail, setContactEmail] = useState("");
  const [whatsAppNumber, setWhatsAppNumber] = useState("+47 400 00 000");
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  const loadData = useCallback(async (token: string, email: string) => {
    try {
      const isDevBypass = token.startsWith("dev-bypass-");

      let tenantData: TenantRow | null = null;
      let bookingsData: AdminBooking[] = [];
      let blackoutsData: BlackoutRow[] = [];
      let servicesData: ServiceRow[] = [];
      let hoursData: HourRow[] = [];
      let hoursLoadedFromApi = false;

      const tenantId = "gangina";

      const tokenToUse =
        token ||
        (typeof window !== "undefined"
          ? localStorage.getItem("dev_admin_token") || localStorage.getItem("admin_token") || ""
          : "");

      // 1. Try server-side admin API endpoint with Bearer token (bypasses RLS for owner & dev bypass)
      try {
        const apiRes = await fetch(`/api/admin/bookings?tenant_id=gangina`, {
          cache: "no-store",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
            "x-admin-token": tokenToUse,
          },
        });
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (apiJson.success) {
            tenantData = apiJson.tenant || null;
            bookingsData = (apiJson.bookings as AdminBooking[]) || [];
            blackoutsData = (apiJson.blackouts as BlackoutRow[]) || [];
            servicesData = (apiJson.services as ServiceRow[]) || [];
            if (Array.isArray(apiJson.hours) && apiJson.hours.length > 0) {
              hoursData = apiJson.hours as HourRow[];
              hoursLoadedFromApi = true;
            }
          }
        }
      } catch (fetchErr) {
        console.warn("Could not load from /api/admin/bookings, attempting client fallback:", fetchErr);
      }

      // Also ensure operating hours are directly fetched from /api/admin/hours with force-dynamic
      if (!hoursLoadedFromApi || hoursData.length === 0) {
        try {
          const hRes = await fetch(`/api/admin/hours?tenant_id=gangina`, {
            cache: "no-store",
            credentials: "include",
            headers: tokenToUse
              ? {
                  Authorization: `Bearer ${tokenToUse}`,
                  "x-admin-token": tokenToUse,
                }
              : {},
          });
          if (hRes.ok) {
            const hJson = await hRes.json();
            if (Array.isArray(hJson.hours) && hJson.hours.length > 0) {
              hoursData = hJson.hours as HourRow[];
              hoursLoadedFromApi = true;
            }
          }
        } catch (hErr) {
          console.warn("Could not load directly from /api/admin/hours:", hErr);
        }
      }

      // 2. Client-side fallback if API didn't return data
      if (!tenantData && !isDevBypass && supabase) {
        const { data: bookingsRes, error: bookingsError } = await supabase
          .from("bookings")
          .select("*")
          .eq("tenant_id", "gangina")
          .order("start_utc", { ascending: false });

        console.log({ bookings: bookingsRes, bookingsError });

        const { data: t } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", "gangina")
          .eq("active", true)
          .maybeSingle();

        if (t) {
          tenantData = t;
        }

        const [kRes, sRes] = await Promise.all([
          supabase
            .from("blackouts")
            .select("*")
            .eq("tenant_id", "gangina")
            .order("start_utc", { ascending: true }),
          supabase
            .from("services")
            .select("*")
            .eq("tenant_id", "gangina")
            .order("sort", { ascending: true }),
        ]);

        bookingsData = (bookingsRes as unknown as AdminBooking[]) || [];
        blackoutsData = (kRes.data as BlackoutRow[]) || [];
        servicesData = (sRes.data as ServiceRow[]) || [];
      }

      if (!tenantData) {
        tenantData = {
          id: "gangina",
          name: "Gangina Beauty Studio",
          owner_email: email,
          ref_prefix: "GNG",
          timezone: "Europe/Oslo",
          allowed_origins: [],
          buffer_min: 10,
          slot_step_min: 15,
          min_notice_min: 120,
          max_days_ahead: 60,
          pending_hold_min: 1440,
          active: true,
          created_at: 1790772301,
        };

        if (supabase) {
          const [bRes, kRes, sRes] = await Promise.all([
            supabase
              .from("bookings")
              .select("*")
              .eq("tenant_id", "gangina")
              .order("start_utc", { ascending: false }),
            supabase
              .from("blackouts")
              .select("*")
              .eq("tenant_id", "gangina")
              .order("start_utc", { ascending: true }),
            supabase
              .from("services")
              .select("*")
              .eq("tenant_id", "gangina")
              .order("sort", { ascending: true }),
          ]);
          bookingsData = (bRes.data as unknown as AdminBooking[]) || [];
          blackoutsData = (kRes.data as BlackoutRow[]) || [];
          servicesData = (sRes.data as ServiceRow[]) || [];
        }

        // Default mock bookings for preview if empty
        if (bookingsData.length === 0) {
          const now = new Date();
          now.setHours(12, 30, 0, 0);
          const startUtc = Math.floor(now.getTime() / 1000);
          bookingsData = [
            {
              id: 991,
              ref: "GNG-8A2B1",
              tenant_id: "gangina",
              service_id: 1,
              start_utc: startUtc,
              end_utc: startUtc + 3600,
              block_end_utc: startUtc + 4200,
              status: "confirmed",
              customer_name: "Abdisalam",
              customer_email: "abdisalam@studio.no",
              customer_phone: "+47 912 34 567",
              notes: "Fast kunde via Bygdøy Allé.",
              price_nok: 550,
              deposit_nok: 0,
              consent_at: startUtc - 86400,
              privacy_version: "v1",
              action_token_hash: "mock",
              manage_token_hash: "mock",
              created_at: startUtc - 86400,
              expires_at: null,
              decided_at: startUtc - 80000,
              service_summary: activePreset.id === "studio-klo" ? "Japansk Strukturgelé - Nytt Sett" : "Custom Shape (Butterfly, Star)",
              custom_fields: activePreset.id === "studio-klo"
                ? { current_nails: "Helt bare negler" }
                : { placement: "Upper Canine" },
            } as AdminBooking,
          ];
        }

        if (servicesData.length === 0) {
          servicesData = [
            { id: 1, tenant_id: activePreset.id, name: "Single Gem", duration_min: 20, price_nok: 350, buffer_min: 10, active: true, sort: 1 },
            { id: 2, tenant_id: activePreset.id, name: "Iridescent Opal Gem", duration_min: 25, price_nok: 450, buffer_min: 10, active: true, sort: 2 },
            { id: 3, tenant_id: activePreset.id, name: "Custom Shape", duration_min: 35, price_nok: 550, buffer_min: 10, active: true, sort: 3 },
          ];
        }
      }

      setTenant(tenantData);
      setBookings(bookingsData);
      setBlackouts(blackoutsData);
      setServices(servicesData);
      setStudioName(tenantData.name);
      setContactEmail(tenantData.owner_email);
      setSlotStepMin(tenantData.slot_step_min || 15);

      // Populate saved weekly opening hours from database
      if (hoursLoadedFromApi && hoursData.length > 0) {
        const weekdays = [0, 1, 2, 3, 4, 5, 6];
        const newWeeklyHours = weekdays.map((weekdayIndex) => {
          const match = hoursData.find((h) => h.weekday === weekdayIndex);
          if (
            match &&
            typeof match.open_min === "number" &&
            typeof match.close_min === "number" &&
            match.open_min < match.close_min
          ) {
            const oH = String(Math.floor(match.open_min / 60)).padStart(2, "0");
            const oM = String(match.open_min % 60).padStart(2, "0");
            const cH = String(Math.floor(match.close_min / 60)).padStart(2, "0");
            const cM = String(match.close_min % 60).padStart(2, "0");
            return {
              weekday: weekdayIndex,
              enabled: true,
              open: `${oH}:${oM}`,
              close: `${cH}:${cM}`,
            };
          }
          return {
            weekday: weekdayIndex,
            enabled: false,
            open: "10:00",
            close: "18:00",
          };
        });
        setWeeklyHours(newWeeklyHours);
      }

      // Auto-open booking drawer if ?ref= param matches
      const targetRef = searchParams.get("ref");
      if (targetRef && bookingsData.length > 0) {
        const found = bookingsData.find(
          (b) => b.ref.toLowerCase() === targetRef.toLowerCase()
        );
        if (found) {
          setSelectedBooking(found);
        }
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantSlug, activePreset, searchParams]);

  // Auth initialization
  useEffect(() => {
    const devToken = localStorage.getItem("dev_admin_token");
    const devEmail = localStorage.getItem("dev_admin_email");

    if (devToken && devEmail) {
      setCurrentTenant("gangina");
      setSessionToken(devToken);
      setUserEmail(devEmail);
      loadData(devToken, devEmail);
      return;
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || !session.user.email) {
        router.push("/admin/login");
        return;
      }
      setSessionToken(session.access_token);
      setUserEmail(session.user.email);
      loadData(session.access_token, session.user.email);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session || !session.user.email) {
        if (!localStorage.getItem("dev_admin_token")) {
          router.push("/admin/login");
        }
      } else {
        setSessionToken(session.access_token);
        setUserEmail(session.user.email);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, loadData]);

  // Security Lock (Sign Out)
  const handleLockSignOut = async () => {
    localStorage.removeItem("dev_admin_token");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("dev_admin_email");
    if (typeof document !== "undefined") {
      document.cookie = "admin_token=; path=/; max-age=0";
    }
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/admin/login");
  };

  // Synchronize button trigger
  const handleSync = () => {
    if (!sessionToken || !userEmail) return;
    setRefreshing(true);
    loadData(sessionToken, userEmail);
  };

  // Status updates: Confirmed, Declined, Cancelled
  const handleStatusUpdate = async (
    bookingId: number,
    status: "confirmed" | "declined" | "cancelled"
  ) => {
    if (!sessionToken) return;
    setActionLoading(bookingId);

    try {
      const res = await fetch("/api/admin/bookings/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        credentials: "include",
        body: JSON.stringify({
          booking_id: bookingId,
          id: bookingId,
          status,
          dev_bypass: true,
        }),
      });

      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
        );
        if (selectedBooking?.id === bookingId) {
          setSelectedBooking((prev) => (prev ? { ...prev, status } : null));
        }
      } else {
        // Update state locally for mock items
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
        );
      }
    } catch {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Quick close rest of today
  const handleCloseRestOfToday = async () => {
    if (!sessionToken) return;
    const now = Math.floor(Date.now() / 1000);
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    const endUtc = Math.floor(d.getTime() / 1000);

    try {
      const res = await fetch("/api/admin/blackouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          start_utc: now,
          end_utc: endUtc,
          reason: "Stengt resten av dagen",
        }),
      });

      if (res.ok && sessionToken && userEmail) {
        loadData(sessionToken, userEmail);
      }
    } catch {
      alert("Nettverksfeil.");
    }
  };

  // Insert 30-min lunch break today (12:30 to 13:00)
  const handleInsertLunchPause = async () => {
    if (!sessionToken) return;
    const now = new Date();
    now.setHours(12, 30, 0, 0);
    const startUtc = Math.floor(now.getTime() / 1000);
    const endUtc = startUtc + 30 * 60;

    try {
      const res = await fetch("/api/admin/blackouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          start_utc: startUtc,
          end_utc: endUtc,
          reason: "Lunsjpause (30 min)",
        }),
      });

      if (res.ok && sessionToken && userEmail) {
        loadData(sessionToken, userEmail);
      }
    } catch {
      alert("Kunne ikke legge til lunsjpause.");
    }
  };

  // Submit custom vacation / blackout
  const handleSaveBlackout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !blackoutStart || !blackoutEnd) return;

    setBlackoutSubmitting(true);
    try {
      const startUtc = Math.floor(new Date(blackoutStart).getTime() / 1000);
      const endUtc = Math.floor(new Date(blackoutEnd).getTime() / 1000);

      const res = await fetch("/api/admin/blackouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          start_utc: startUtc,
          end_utc: endUtc,
          reason: blackoutReason,
        }),
      });

      if (res.ok) {
        setShowBlackoutModal(false);
        setBlackoutStart("");
        setBlackoutEnd("");
        if (sessionToken && userEmail) loadData(sessionToken, userEmail);
      }
    } catch {
      alert("Nettverksfeil.");
    } finally {
      setBlackoutSubmitting(false);
    }
  };

  const handleDeleteBlackout = async (id: number) => {
    if (!sessionToken || !confirm("Vil du fjerne denne sperringen?")) return;

    try {
      const res = await fetch(`/api/admin/blackouts?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });

      if (res.ok && sessionToken && userEmail) {
        loadData(sessionToken, userEmail);
      }
    } catch {
      alert("Nettverksfeil.");
    }
  };

  // Save Schedule & Hours
  const handleSaveSchedule = async () => {
    const tokenToUse =
      sessionToken ||
      (typeof window !== "undefined"
        ? localStorage.getItem("dev_admin_token") || localStorage.getItem("admin_token") || ""
        : "");

    if (!tokenToUse) {
      setSaveScheduleStatus("error");
      setSaveScheduleMessage("Du må være innlogget for å lagre åpningstider.");
      return;
    }

    const previousHours = [...weeklyHours];
    setSavingHours(true);
    setSaveScheduleStatus("saving");
    setSaveScheduleMessage("");

    try {
      const formatted = weeklyHours
        .filter((h) => h.enabled)
        .map((h) => {
          const [oH, oM] = h.open.split(":").map(Number);
          const [cH, cM] = h.close.split(":").map(Number);
          return {
            weekday: h.weekday,
            open_min: oH * 60 + oM,
            close_min: cH * 60 + cM,
          };
        });

      const res = await fetch("/api/admin/hours", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenToUse}`,
          "x-admin-token": tokenToUse,
        },
        credentials: "include",
        body: JSON.stringify({
          tenant_id: "gangina",
          hours: formatted,
          slot_step_min: slotStepMin,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Kunne ikke lagre åpningstider.");
      }

      const resJson = await res.json().catch(() => ({}));
      if (Array.isArray(resJson.hours)) {
        const savedHours: HourRow[] = resJson.hours;
        const updated = [0, 1, 2, 3, 4, 5, 6].map((w) => {
          const m = savedHours.find((h) => h.weekday === w);
          if (m && typeof m.open_min === "number" && typeof m.close_min === "number" && m.open_min < m.close_min) {
            const oH = String(Math.floor(m.open_min / 60)).padStart(2, "0");
            const oM = String(m.open_min % 60).padStart(2, "0");
            const cH = String(Math.floor(m.close_min / 60)).padStart(2, "0");
            const cM = String(m.close_min % 60).padStart(2, "0");
            return { weekday: w, enabled: true, open: `${oH}:${oM}`, close: `${cH}:${cM}` };
          }
          return { weekday: w, enabled: false, open: "10:00", close: "18:00" };
        });
        setWeeklyHours(updated);
      }

      setSaveScheduleStatus("saved");
      setSaveScheduleMessage("Åpningstider lagret!");
      setTimeout(() => {
        setSaveScheduleStatus((curr) => (curr === "saved" ? "idle" : curr));
        setSaveScheduleMessage("");
      }, 3000);

      if (tokenToUse && userEmail) {
        loadData(tokenToUse, userEmail).catch(() => {});
      }
    } catch (err: unknown) {
      setWeeklyHours(previousHours);
      setSaveScheduleStatus("error");
      const msg = err instanceof Error ? err.message : "Kunne ikke lagre åpningstider.";
      setSaveScheduleMessage(msg);
      setTimeout(() => {
        setSaveScheduleStatus((curr) => (curr === "error" ? "idle" : curr));
        setSaveScheduleMessage("");
      }, 5000);
    } finally {
      setSavingHours(false);
    }
  };

  // Save Studio Settings
  const handleSaveSettings = async () => {
    const tokenToUse =
      sessionToken ||
      (typeof window !== "undefined"
        ? localStorage.getItem("dev_admin_token") || localStorage.getItem("admin_token") || ""
        : "");

    if (!tokenToUse) {
      setSettingsNotice("Du må være innlogget for å lagre innstillinger.");
      return;
    }
    setSavingSettings(true);
    setSettingsNotice(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenToUse}`,
          "x-admin-token": tokenToUse,
        },
        credentials: "include",
        body: JSON.stringify({
          tenant_id: "gangina",
          name: studioName,
          owner_email: contactEmail,
        }),
      });

      if (res.ok) {
        setSettingsNotice("Innstillinger ble lagret.");
        if (tokenToUse && userEmail) loadData(tokenToUse, userEmail);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setSettingsNotice(errJson.message || "Feil ved lagring av innstillinger.");
      }
    } catch {
      setSettingsNotice("Feil ved lagring av innstillinger.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Send Test Notification Email
  const handleSendTestEmail = async () => {
    const tokenToUse =
      sessionToken ||
      (typeof window !== "undefined"
        ? localStorage.getItem("dev_admin_token") || localStorage.getItem("admin_token") || ""
        : "");

    if (!tokenToUse || !contactEmail) return;
    setTestingEmail(true);
    setSettingsNotice(null);

    try {
      const res = await fetch("/api/admin/settings/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenToUse}`,
          "x-admin-token": tokenToUse,
        },
        credentials: "include",
        body: JSON.stringify({
          tenant_id: activePreset.id,
          email: contactEmail,
        }),
      });

      if (res.ok) {
        setSettingsNotice(`Testvarsel sendt til ${contactEmail}`);
      } else {
        setSettingsNotice("Kunne ikke sende testvarsel.");
      }
    } catch {
      setSettingsNotice("Nettverksfeil under sending.");
    } finally {
      setTestingEmail(false);
    }
  };

  // Filtered Bookings for Feed
  const nowUtc = Math.floor(Date.now() / 1000);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        if (statusFilter === "pending") return b.status === "pending";
        if (statusFilter === "confirmed") return b.status === "confirmed" && b.start_utc >= nowUtc;
        if (statusFilter === "past") return b.start_utc < nowUtc || b.status === "cancelled" || b.status === "declined";
        return true;
      })
      .sort((a, b) => {
        // Pending bookings render at the top without requiring extra filter toggles
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        return b.start_utc - a.start_utc;
      });
  }, [bookings, statusFilter, nowUtc]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-[#FAF8F5] text-[#111113] flex items-center justify-center p-6 font-mono text-xs">
        <p className="text-[#8a8a8a]">Laster Pocket Studio Manager...</p>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-[#FAF8F5] text-[#111113] selection:bg-[#111113] selection:text-white font-sans relative">
      {/* MONOGRAM WATERMARK */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-[0.03] z-0"
        aria-hidden="true"
      >
        <span className="text-[25vw] font-black uppercase tracking-tighter text-[#111113]">
          {activePreset.theme?.watermarkText || activePreset.name}
        </span>
      </div>

      {/* CENTERED LUXURY COLUMN */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* HEADER BAR WITH MONOGRAM BADGE & SECURITY LOCK */}
        <header className="rounded-3xl border border-[#EAE6E1] bg-white p-5 sm:p-6 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#111113] text-white flex items-center justify-center font-bold text-sm tracking-wider uppercase">
              {activePreset.name.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.35em] text-[#8a8a8a] font-semibold">
                  Pocket Studio Manager
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[#111113]">
                {tenant?.name || activePreset.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tenant switcher */}
            <div className="flex items-center border border-[#EAE6E1] rounded-xl bg-[#FAF8F5] overflow-hidden text-[10px] font-semibold">
              <a
                href="/admin?tenant=gangina"
                className={`px-2.5 py-1.5 transition-colors ${
                  activePreset.id === "gangina"
                    ? "bg-[#111113] text-white"
                    : "text-[#8a8a8a] hover:text-[#111113]"
                }`}
              >
                Gangina
              </a>
              <a
                href="/admin?tenant=studio-klo"
                className={`px-2.5 py-1.5 transition-colors ${
                  activePreset.id === "studio-klo"
                    ? "bg-[#4a5848] text-white"
                    : "text-[#8a8a8a] hover:text-[#111113]"
                }`}
              >
                Klō
              </a>
            </div>

            {/* Security Lock Button */}
            <button
              type="button"
              onClick={handleLockSignOut}
              className="py-1.5 px-3 rounded-xl border border-[#EAE6E1] bg-white text-[11px] font-semibold text-[#8a8a8a] hover:text-[#111113] hover:border-[#111113] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>🔒 Lås</span>
            </button>
          </div>
        </header>

        {/* YIN-YANG FLUID WAVE ACCENT DIVIDER */}
        <div className="w-full overflow-hidden leading-none rounded-2xl bg-white border border-[#EAE6E1] shadow-xs">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111113] text-white">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-[0.35em] text-[#C5A880] font-semibold block">
                {new Date().toLocaleDateString("no-NO", { weekday: "long", day: "numeric", month: "long" })}
              </span>
              <h2 className="text-base font-bold tracking-tight">
                Studio Oversikt · {bookings.length} registrerte avtaler
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="py-2 px-3.5 rounded-full bg-[#C5A880] text-[#111113] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
              >
                + Book time
              </button>
              <button
                type="button"
                onClick={handleSync}
                disabled={refreshing}
                className="py-2 px-3.5 rounded-full border border-white/20 text-white text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer"
              >
                {refreshing ? "↻ ..." : "↻ Synkroniser"}
              </button>
            </div>
          </div>

          <svg viewBox="0 0 1200 48" preserveAspectRatio="none" className="w-full h-4 sm:h-6 fill-[#111113] -mt-0.5">
            <path d="M0,0 C300,48 900,0 1200,48 L1200,0 L0,0 Z" />
          </svg>
        </div>

        {/* PILL-SHAPED TAB BAR */}
        <nav className="flex items-center justify-center p-1.5 rounded-full border border-[#EAE6E1] bg-white shadow-xs max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab("appointments")}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "appointments"
                ? "bg-[#111113] text-white shadow-xs"
                : "text-[#8a8a8a] hover:text-[#111113]"
            }`}
          >
            <span>Avtaler</span>
            {pendingCount > 0 && (
              <span className="bg-[#C5A880] text-[#111113] text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === "schedule"
                ? "bg-[#111113] text-white shadow-xs"
                : "text-[#8a8a8a] hover:text-[#111113]"
            }`}
          >
            Åpningstider
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-[#111113] text-white shadow-xs"
                : "text-[#8a8a8a] hover:text-[#111113]"
            }`}
          >
            Innstillinger
          </button>
        </nav>

        {/* TAB 1: APPOINTMENTS PANEL */}
        {activeTab === "appointments" && (
          <section id="panel-appointments" className="space-y-6">
            {/* YIN-YANG DAGSAGENDA VISUAL TIMELINE */}
            <div className="w-full rounded-[32px] overflow-hidden border border-[#EAE6E1] bg-white shadow-xs font-sans">
              {/* TOP WHITE CANVAS: MONTH CAROUSEL & 7-DAY STRIP */}
              <div className="p-5 sm:p-7 space-y-6 bg-white text-[#0D0D0D]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#8a8a8a]">
                    Visuell Dagsagenda
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Intl.DateTimeFormat("en-CA", {
                        timeZone: "Europe/Oslo",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(new Date());
                      setTimelineDate(today);
                      const d = new Date();
                      d.setHours(0, 0, 0, 0);
                      setTimelineWeekStart(d);
                    }}
                    className="text-xs font-semibold text-[#111113] hover:underline cursor-pointer"
                  >
                    I dag
                  </button>
                </div>

                {/* Horizontal Month Carousel */}
                <div className="flex items-center justify-between px-1 select-none">
                  <button
                    type="button"
                    onClick={handlePrevWeek}
                    className="text-xs font-medium text-neutral-300 hover:text-neutral-600 transition-colors cursor-pointer"
                  >
                    {prevMonthName}
                  </button>

                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-[#0D0D0D]">
                    {currentMonthName} <span className="text-neutral-400 font-normal text-base">{currentYear}</span>
                  </h3>

                  <button
                    type="button"
                    onClick={handleNextWeek}
                    className="text-xs font-medium text-neutral-300 hover:text-neutral-600 transition-colors cursor-pointer"
                  >
                    {nextMonthName}
                  </button>
                </div>

                {/* Horizontal 7-Day Strip with Active Day Capsule */}
                <div className="flex items-center justify-between gap-1 sm:gap-2 pt-1 overflow-x-auto pb-1 no-scrollbar">
                  {timelineDaysInStrip.map((d) => {
                    const isSelected = timelineDate === d.dateStr;
                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        onClick={() => setTimelineDate(d.dateStr)}
                        className={`transition-all flex flex-col items-center justify-center cursor-pointer shrink-0 ${
                          isSelected
                            ? "bg-[#0D0D0D] text-white rounded-full w-11 py-3.5 shadow-lg scale-105"
                            : "hover:bg-neutral-100 rounded-full w-10 py-2.5 text-[#0D0D0D]"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                          {d.weekdayInitial}
                        </span>
                        <span className="text-sm font-extrabold mt-1">
                          {d.dayNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ASYMMETRICAL WAVE S-CURVE TRANSITION */}
              <YinYangWave fill="#0D0D0D" direction="down" />

              {/* BOTTOM BLACK CANVAS: TIMELINE & INVERTED ACTIVE CARDS */}
              <div className="bg-[#0D0D0D] text-white p-6 sm:p-8 space-y-6 -mt-1">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight">
                      Dagsagenda
                    </h4>
                    <p className="text-xs text-neutral-400 mt-0.5 capitalize">
                      {selectedDateTitle}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-[#C5A880]">
                    {timelineBookings.length} {timelineBookings.length === 1 ? "avtale" : "avtaler"}
                  </span>
                </div>

                {/* Timeline content */}
                {timelineBookings.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center space-y-3">
                    <p className="text-xs text-neutral-400">
                      Ingen avtaler booket for denne dagen
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowManualModal(true)}
                      className="py-2 px-4 rounded-full bg-white text-[#0D0D0D] font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      + Registrer manuell time
                    </button>
                  </div>
                ) : (
                  <div className="relative pl-6 sm:pl-8 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-white/20">
                    {timelineBookings.map((b) => {
                      const startTimeStr = formatOsloTime(b.start_utc);
                      const endTimeStr = formatOsloTime(b.end_utc);
                      const durationMin = Math.round((b.end_utc - b.start_utc) / 60);
                      const serviceName = b.service_summary || b.services?.name || `Behandling #${b.service_id}`;
                      const isPending = b.status === "pending";
                      const isConfirmed = b.status === "confirmed";

                      return (
                        <div key={b.id} className="relative group">
                          {/* Node bullet */}
                          <span className="absolute -left-[29px] sm:-left-[37px] top-4 w-3.5 h-3.5 rounded-full bg-[#C5A880] ring-4 ring-[#0D0D0D] block" />

                          {/* Timestamp */}
                          <div className="text-[11px] font-mono text-neutral-400 mb-1.5 flex items-center gap-2">
                            <span>{startTimeStr} – {endTimeStr}</span>
                            <span className="text-neutral-500">({durationMin} min)</span>
                          </div>

                          {/* Inverted Active Card */}
                          <div
                            onClick={() => setSelectedBooking(b)}
                            className="bg-white text-[#0D0D0D] rounded-2xl p-4 sm:p-5 shadow-xl border-l-4 border-[#C5A880] hover:scale-[1.01] transition-all cursor-pointer space-y-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h5 className="font-bold text-sm sm:text-base text-[#0D0D0D] group-hover:underline">
                                  {b.customer_name}
                                </h5>
                                <p className="text-xs text-neutral-500 mt-0.5">
                                  {serviceName}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span
                                  className={`inline-block text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                    isConfirmed
                                      ? "bg-emerald-100 text-emerald-800"
                                      : isPending
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-neutral-100 text-neutral-600"
                                  }`}
                                >
                                  {b.status}
                                </span>
                                <span className="block text-xs font-bold text-[#0D0D0D] mt-1">
                                  {b.price_nok > 0 ? `${b.price_nok} ${activePreset.currency}` : "Gratis"}
                                </span>
                              </div>
                            </div>

                            {/* Intake fields preview if present */}
                            {b.custom_fields && typeof b.custom_fields === "object" && Object.keys(b.custom_fields).length > 0 && (
                              <div className="pt-2 border-t border-neutral-100 flex flex-wrap gap-1 text-[11px] text-neutral-600">
                                {Object.entries(b.custom_fields).map(([k, v]) => (
                                  <span key={k} className="bg-neutral-100 px-2 py-0.5 rounded-md">
                                    <strong className="capitalize">{k.replace(/_/g, " ")}:</strong> {String(v)}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="pt-1 flex items-center justify-between text-[11px] text-neutral-400">
                              <span>Ref: {b.ref}</span>
                              <span className="font-semibold text-[#0D0D0D] group-hover:translate-x-0.5 transition-all">
                                Administrer avtale →
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Status Filter Segment */}
            <div className="flex items-center justify-start gap-1.5 overflow-x-auto pb-1 text-xs">
              {(
                [
                  { id: "all", label: "Alle" },
                  { id: "pending", label: `Venter (${pendingCount})` },
                  { id: "confirmed", label: "Bekreftet" },
                  { id: "past", label: "Passerte" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`py-1.5 px-3.5 rounded-full font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === f.id
                      ? "bg-[#111113] text-white"
                      : "bg-white border border-[#EAE6E1] text-[#8a8a8a] hover:text-[#111113]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Appointments Feed */}
            {filteredBookings.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed border-[#EAE6E1] bg-white text-center text-xs text-[#8a8a8a]">
                Ingen avtaler i denne kategorien
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((b) => {
                  const isLoading = actionLoading === b.id;
                  const isPending = b.status === "pending";
                  const isConfirmed = b.status === "confirmed";

                  // Clean phone number for WhatsApp link
                  let cleanPhone = b.customer_phone.replace(/[^0-9]/g, "");
                  if (cleanPhone.length === 8) cleanPhone = "47" + cleanPhone;

                  const dateStr = formatOsloDate(b.start_utc);
                  const timeStr = formatOsloTime(b.start_utc);
                  const firstName = b.customer_name.split(" ")[0] || b.customer_name;
                  const waText = `Hei ${firstName}! Viser til din time hos ${tenant?.name || activePreset.name} den ${dateStr} kl.${timeStr}.`;
                  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;

                  return (
                    <div
                      key={b.id}
                      className="rounded-3xl border border-[#EAE6E1] bg-white p-5 shadow-xs space-y-4 hover:border-[#111113] transition-colors"
                    >
                      {/* Top Row: Client Name, Status & Ref */}
                      <div className="flex items-start justify-between gap-3 border-b border-[#EAE6E1] pb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#EAE6E1] text-[#111113] flex items-center justify-center text-xs font-bold uppercase shrink-0">
                            {b.customer_name.slice(0, 2)}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setSelectedBooking(b)}
                              className="font-bold text-sm text-[#111113] hover:underline text-left cursor-pointer"
                            >
                              {b.customer_name}
                            </button>
                            <div className="text-xs text-[#8a8a8a]">
                              {b.customer_phone} · {b.customer_email || "Ingen e-post"}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isConfirmed
                                ? "bg-emerald-100 text-emerald-800"
                                : isPending
                                ? "bg-amber-100 text-amber-800"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {b.status}
                          </span>
                          <span className="block text-[10px] text-[#8a8a8a] mt-0.5">
                            Ref: {b.ref}
                          </span>
                        </div>
                      </div>

                      {/* Middle Details: Time, Service, Price & Intake */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="font-semibold text-[#111113] flex items-center gap-1.5">
                            <span className="text-[#C5A880]">●</span>
                            <span>{formatOsloDateTime(b.start_utc)}</span>
                          </div>
                          <div className="text-[#8a8a8a]">
                            {b.service_summary || b.services?.name || `Tjeneste #${b.service_id}`} ·{" "}
                            <strong className="text-[#111113]">
                              {b.price_nok > 0 ? `${b.price_nok} ${activePreset.currency}` : "Gratis konsultasjon"}
                            </strong>
                          </div>
                        </div>

                        {/* Intake / Notes display */}
                        {(b.custom_fields || b.notes) && (
                          <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE6E1] text-[11px] text-[#111113] space-y-0.5">
                            {b.custom_fields && typeof b.custom_fields === "object" && (
                              Object.entries(b.custom_fields).map(([k, v]) => (
                                <div key={k} className="text-[#8a8a8a]">
                                  <span className="font-medium text-[#111113] capitalize">{k.replace(/_/g, " ")}:</span> {String(v)}
                                </div>
                              ))
                            )}
                            {b.notes && (
                              <div className="text-[#8a8a8a] italic truncate">
                                &quot;{b.notes}&quot;
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Bar Triggers */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#EAE6E1]">
                        <div className="flex items-center gap-2">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleStatusUpdate(b.id, "confirmed")}
                                className="py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {isLoading ? "..." : "Godkjenn"}
                              </button>
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleStatusUpdate(b.id, "declined")}
                                className="py-1.5 px-3 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Avslå
                              </button>
                            </>
                          )}

                          {isConfirmed && (
                            <button
                              type="button"
                              onClick={() => setRescheduleBooking(b)}
                              className="py-1.5 px-3 rounded-xl border border-[#EAE6E1] bg-white text-xs font-semibold text-[#111113] hover:border-[#111113] transition-colors cursor-pointer"
                            >
                              Flytt time
                            </button>
                          )}

                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="py-1.5 px-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                          >
                            WhatsApp
                          </a>

                          <a
                            href={`tel:${b.customer_phone}`}
                            className="py-1.5 px-3 rounded-xl border border-[#EAE6E1] text-[#111113] text-xs font-semibold hover:bg-[#FAF8F5] transition-colors"
                          >
                            Ring
                          </a>
                        </div>

                        {b.status !== "cancelled" && b.status !== "declined" && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleStatusUpdate(b.id, "cancelled")}
                            className="text-[11px] text-red-600 hover:underline cursor-pointer"
                          >
                            Avlys
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: SCHEDULE & HOURS PANEL */}
        {activeTab === "schedule" && (
          <section id="panel-schedule" className="space-y-6">
            {/* Quick Actions Card */}
            <div className="rounded-3xl border border-[#EAE6E1] bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <span className="text-[10px] uppercase tracking-[0.35em] text-[#8a8a8a] font-semibold block">
                Hurtigsperrer
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCloseRestOfToday}
                  className="py-3 px-4 rounded-2xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] font-semibold text-xs hover:border-[#111113] transition-colors cursor-pointer"
                >
                  Steng i dag (Resten av dagen)
                </button>
                <button
                  type="button"
                  onClick={handleInsertLunchPause}
                  className="py-3 px-4 rounded-2xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] font-semibold text-xs hover:border-[#111113] transition-colors cursor-pointer"
                >
                  Sett inn 30 min lunsjpause nå (12:30)
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlackoutModal(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-[#111113] text-white font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  + Planlegg ferie eller fravær
                </button>
              </div>
            </div>

            {/* Weekly Working Hours Configuration */}
            <div className="rounded-3xl border border-[#EAE6E1] bg-white p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.35em] text-[#8a8a8a] font-semibold block">
                    Faste Åpningstider
                  </span>
                  <h3 className="text-base font-bold text-[#111113]">
                    Ukeplan & Skift
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#8a8a8a]">Intervall:</span>
                  <select
                    value={slotStepMin}
                    onChange={(e) => setSlotStepMin(Number(e.target.value))}
                    className="p-1.5 rounded-lg border border-[#EAE6E1] bg-[#FAF8F5] text-xs font-semibold outline-none"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </div>
              </div>

              <div className="divide-y divide-[#EAE6E1] text-xs">
                {weeklyHours.map((h, idx) => (
                  <div key={h.weekday} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="w-28 font-semibold text-[#111113]">
                      {WEEKDAYS[h.weekday]}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...weeklyHours];
                          next[idx].enabled = !next[idx].enabled;
                          setWeeklyHours(next);
                        }}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                          h.enabled
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {h.enabled ? "Åpen" : "Stengt"}
                      </button>

                      {h.enabled && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="time"
                            value={h.open}
                            onChange={(e) => {
                              const next = [...weeklyHours];
                              next[idx].open = e.target.value;
                              setWeeklyHours(next);
                            }}
                            className="p-1.5 rounded-lg border border-[#EAE6E1] bg-[#FAF8F5] text-xs"
                          />
                          <span className="text-[#8a8a8a]">til</span>
                          <input
                            type="time"
                            value={h.close}
                            onChange={(e) => {
                              const next = [...weeklyHours];
                              next[idx].close = e.target.value;
                              setWeeklyHours(next);
                            }}
                            className="p-1.5 rounded-lg border border-[#EAE6E1] bg-[#FAF8F5] text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={savingHours}
                  onClick={handleSaveSchedule}
                  className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-[#111113] text-white text-xs font-semibold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer flex items-center justify-center gap-2"
                >
                  {savingHours && (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  )}
                  {savingHours ? "Lagrer..." : "Lagre åpningstider"}
                </button>

                {saveScheduleStatus === "saved" && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl animate-in fade-in duration-200">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{saveScheduleMessage || "Lagret!"}</span>
                  </div>
                )}

                {saveScheduleStatus === "error" && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl animate-in fade-in duration-200">
                    <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>{saveScheduleMessage || "Feil under lagring"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Active Blackouts List */}
            {blackouts.length > 0 && (
              <div className="rounded-3xl border border-[#EAE6E1] bg-white p-5 sm:p-6 shadow-xs space-y-3">
                <span className="text-[10px] uppercase tracking-[0.35em] text-[#8a8a8a] font-semibold block">
                  Aktive Fraværsperioder ({blackouts.length})
                </span>

                <div className="space-y-2">
                  {blackouts.map((k) => (
                    <div
                      key={k.id}
                      className="p-3 rounded-2xl border border-[#EAE6E1] bg-[#FAF8F5] flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#111113]">{k.reason || "Fravær"}</span>
                        <div className="text-[11px] text-[#8a8a8a]">
                          {formatOsloDateTime(k.start_utc)} — {formatOsloDateTime(k.end_utc)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBlackout(k.id)}
                        className="py-1 px-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-semibold cursor-pointer"
                      >
                        Slett
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: STUDIO SETTINGS PANEL */}
        {activeTab === "settings" && (
          <section id="panel-settings" className="space-y-6">
            <div className="rounded-3xl border border-[#EAE6E1] bg-white p-6 sm:p-7 shadow-xs space-y-5">
              <div>
                <span className="text-[10px] uppercase tracking-[0.35em] text-[#8a8a8a] font-semibold block">
                  Studio Konfigurasjon
                </span>
                <h3 className="text-base font-bold text-[#111113]">
                  Grunnleggende Innstillinger
                </h3>
              </div>

              {settingsNotice && (
                <div className="p-3 rounded-xl bg-neutral-100 text-[#111113] text-xs font-medium">
                  {settingsNotice}
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
                    Salongnavn
                  </label>
                  <input
                    type="text"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
                    E-post for varsling og bekreftelser
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
                    WhatsApp Telefonnummer
                  </label>
                  <input
                    type="tel"
                    value={whatsAppNumber}
                    onChange={(e) => setWhatsAppNumber(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113]"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  disabled={savingSettings}
                  onClick={handleSaveSettings}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#111113] text-white text-xs font-semibold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer text-center"
                >
                  {savingSettings ? "Lagrer..." : "Lagre innstillinger"}
                </button>
                <button
                  type="button"
                  disabled={testingEmail}
                  onClick={handleSendTestEmail}
                  className="py-3 px-4 rounded-xl border border-[#EAE6E1] bg-white text-[#111113] text-xs font-semibold hover:bg-[#FAF8F5] transition-colors cursor-pointer text-center"
                >
                  {testingEmail ? "Sender..." : "Send test-varsel"}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* CLIENT COMMUNICATIONS DRAWER */}
      <ClientDrawer
        booking={selectedBooking}
        tenantName={tenant?.name || activePreset.name}
        onClose={() => setSelectedBooking(null)}
        onStatusUpdate={handleStatusUpdate}
        onReschedule={(b) => setRescheduleBooking(b)}
        actionLoading={actionLoading}
      />

      {/* RESCHEDULE MODAL */}
      <RescheduleModal
        booking={rescheduleBooking}
        sessionToken={sessionToken}
        onClose={() => setRescheduleBooking(null)}
        onSuccess={(updated) => {
          setBookings((prev) =>
            prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
          );
        }}
      />

      {/* MANUAL WALK-IN / PHONE BOOKING MODAL */}
      <ManualBookingModal
        tenantId={activePreset.id}
        services={services}
        isOpen={showManualModal}
        sessionToken={sessionToken}
        onClose={() => setShowManualModal(false)}
        onSuccess={(newBooking) => {
          setBookings((prev) => [newBooking, ...prev]);
        }}
      />

      {/* PLANLEGG FERIE MODAL */}
      {showBlackoutModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 font-sans"
          onClick={() => setShowBlackoutModal(false)}
        >
          <form
            onSubmit={handleSaveBlackout}
            className="w-full max-w-sm rounded-3xl bg-white border border-[#EAE6E1] p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#EAE6E1]">
              <span className="font-bold uppercase tracking-wider text-xs text-[#111113]">
                Planlegg Ferie / Fravær
              </span>
              <button
                type="button"
                onClick={() => setShowBlackoutModal(false)}
                className="text-[#8a8a8a] hover:text-[#111113] text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
                  Fra tidspunkt
                </label>
                <input
                  type="datetime-local"
                  required
                  value={blackoutStart}
                  onChange={(e) => setBlackoutStart(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
                  Til tidspunkt
                </label>
                <input
                  type="datetime-local"
                  required
                  value={blackoutEnd}
                  onChange={(e) => setBlackoutEnd(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
                  Årsak
                </label>
                <div className="flex gap-2">
                  {["Ferie", "Kurs", "Pause"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBlackoutReason(r)}
                      className={`flex-1 py-1.5 rounded-xl border text-[11px] font-semibold transition-colors cursor-pointer ${
                        blackoutReason === r
                          ? "bg-[#111113] text-white border-[#111113]"
                          : "border-[#EAE6E1] text-[#8a8a8a] hover:text-[#111113]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="submit"
                disabled={blackoutSubmitting}
                className="flex-1 py-3 rounded-xl bg-[#111113] text-white text-xs font-semibold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
              >
                {blackoutSubmitting ? "Lagrer..." : "Lagre fravær"}
              </button>
              <button
                type="button"
                onClick={() => setShowBlackoutModal(false)}
                className="flex-1 py-3 rounded-xl border border-[#EAE6E1] text-[#8a8a8a] hover:text-[#111113] text-xs font-semibold uppercase cursor-pointer"
              >
                Avbryt
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex items-center justify-center p-6 font-mono text-xs bg-[#FAF8F5] text-[#8a8a8a]">
          Laster Pocket Studio Manager...
        </main>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}
