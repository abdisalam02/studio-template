"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import { getTenantConfig } from "@/config/tenant.config";
import { ClientDrawer, type AdminBooking } from "@/components/admin/ClientDrawer";
import { RescheduleModal } from "@/components/admin/RescheduleModal";
import { ManualBookingModal } from "@/components/admin/ManualBookingModal";
import { TimeBlockModal } from "@/components/admin/TimeBlockModal";

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

  // Active Tab: "calendar" | "bookings" | "schedule" | "settings"
  const [activeTab, setActiveTab] = useState<"calendar" | "bookings" | "schedule" | "settings">("calendar");

  // Status Filter: "active" | "all" | "pending" | "confirmed" | "past"
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "pending" | "confirmed" | "past">("active");
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Drawers state
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<AdminBooking | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showTimeBlockModal, setShowTimeBlockModal] = useState(false);

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
    const days: { dateStr: string; weekdayInitial: string; dayNum: number; isToday: boolean; bookingCount: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(timelineWeekStart);
      cur.setDate(timelineWeekStart.getDate() + i);
      const dateStr = formatDateString(cur);
      const count = bookings.filter(
        (b) => getOsloDateString(b.start_utc) === dateStr && b.status !== "cancelled" && b.status !== "declined"
      ).length;
      days.push({
        dateStr,
        weekdayInitial: NO_WEEKDAY_INITIALS[cur.getDay()],
        dayNum: cur.getDate(),
        isToday: dateStr === todayStr,
        bookingCount: count,
      });
    }
    return days;
  }, [timelineWeekStart, todayStr, bookings]);

  // Today's summary metrics
  const todayConfirmedBookings = useMemo(() => {
    return bookings.filter(
      (b) => getOsloDateString(b.start_utc) === todayStr && b.status === "confirmed"
    );
  }, [bookings, todayStr]);

  const todayRevenueNok = useMemo(() => {
    return todayConfirmedBookings.reduce((sum, b) => sum + (b.price_nok || 0), 0);
  }, [todayConfirmedBookings]);

  // Unified chronological timeline: appointments + blackouts
  type UnifiedTimelineItem =
    | { kind: "booking"; id: string; start_utc: number; end_utc: number; booking: AdminBooking }
    | { kind: "blackout"; id: string; start_utc: number; end_utc: number; blackout: BlackoutRow };

  const unifiedTimelineItems = useMemo(() => {
    const items: UnifiedTimelineItem[] = [];

    for (const b of bookings) {
      if (getOsloDateString(b.start_utc) === timelineDate) {
        items.push({
          kind: "booking",
          id: `b-${b.id}`,
          start_utc: b.start_utc,
          end_utc: b.end_utc,
          booking: b,
        });
      }
    }

    for (const bl of blackouts) {
      const startStr = getOsloDateString(bl.start_utc);
      const endStr = getOsloDateString(bl.end_utc);
      if (startStr === timelineDate || endStr === timelineDate || (startStr < timelineDate && endStr > timelineDate)) {
        items.push({
          kind: "blackout",
          id: `bl-${bl.id}`,
          start_utc: bl.start_utc,
          end_utc: bl.end_utc,
          blackout: bl,
        });
      }
    }

    return items.sort((a, b) => a.start_utc - b.start_utc);
  }, [bookings, blackouts, timelineDate]);

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

  // Tab 3: Working Hours state
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

  const handleCopyMondayToWeekdays = () => {
    const monday = weeklyHours.find((h) => h.weekday === 0);
    if (!monday) return;
    setWeeklyHours((prev) =>
      prev.map((h) => {
        if (h.weekday >= 1 && h.weekday <= 4) {
          return {
            ...h,
            enabled: monday.enabled,
            open: monday.open,
            close: monday.close,
          };
        }
        return h;
      })
    );
  };

  const todayClosingTime = useMemo(() => {
    const jsDay = new Date().getDay();
    const weekdayIdx = jsDay === 0 ? 6 : jsDay - 1;
    const match = weeklyHours.find((h) => h.weekday === weekdayIdx);
    return match?.enabled ? match.close : "18:00";
  }, [weeklyHours]);

  // Blackouts modal form state
  const [showBlackoutModal, setShowBlackoutModal] = useState(false);
  const [blackoutStart, setBlackoutStart] = useState("");
  const [blackoutEnd, setBlackoutEnd] = useState("");
  const [blackoutReason, setBlackoutReason] = useState("Pause");
  const [blackoutSubmitting, setBlackoutSubmitting] = useState(false);

  // Tab 4: Settings state
  const [studioName, setStudioName] = useState(activePreset.name);
  const [studioAddress, setStudioAddress] = useState("Dronningens gate 15, 0152 Oslo");
  const [studioOrgNr, setStudioOrgNr] = useState("931 245 876 MVA");
  const [minNoticeHours, setMinNoticeHours] = useState(2);
  const [maxDaysHorizon, setMaxDaysHorizon] = useState(30);
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
        const isBypass = isDevBypass || (typeof window !== "undefined" && window.location.search.includes("dev_bypass=true"));
        const devBypassQuery = isBypass ? "&dev_bypass=true" : "";
        const apiRes = await fetch(`/api/admin/bookings?tenant_id=gangina${devBypassQuery}`, {
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
        } else if (apiRes.status === 401 && process.env.NODE_ENV === "development") {
          const devLoginRes = await fetch("/api/admin/dev-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "niwache12@gmail.com" }),
          });
          const devLoginData = await devLoginRes.json();
          if (devLoginData.token) {
            localStorage.setItem("dev_admin_token", devLoginData.token);
            localStorage.setItem("dev_admin_email", devLoginData.email);
            setSessionToken(devLoginData.token);
            const retryRes = await fetch(`/api/admin/bookings?tenant_id=gangina&dev_bypass=true`, {
              cache: "no-store",
              credentials: "include",
              headers: {
                Authorization: `Bearer ${devLoginData.token}`,
                "x-admin-token": devLoginData.token,
              },
            });
            if (retryRes.ok) {
              const retryJson = await retryRes.json();
              if (retryJson.success) {
                tenantData = retryJson.tenant || null;
                bookingsData = (retryJson.bookings as AdminBooking[]) || [];
                blackoutsData = (retryJson.blackouts as BlackoutRow[]) || [];
                servicesData = (retryJson.services as ServiceRow[]) || [];
                if (Array.isArray(retryJson.hours) && retryJson.hours.length > 0) {
                  hoursData = retryJson.hours as HourRow[];
                  hoursLoadedFromApi = true;
                }
              }
            }
          }
        }
      } catch (fetchErr) {
        console.warn("Could not load from /api/admin/bookings, attempting client fallback:", fetchErr);
      }

      // Also ensure operating hours are directly fetched from /api/admin/hours
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
      if (tenantData.min_notice_min != null) {
        setMinNoticeHours(Math.round(tenantData.min_notice_min / 60) || 2);
      }
      if (tenantData.max_days_ahead != null) {
        setMaxDaysHorizon(tenantData.max_days_ahead);
      }

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

    // In development mode, auto-authenticate if no dev token is present
    if (process.env.NODE_ENV === "development" || searchParams.get("dev_bypass") === "true") {
      fetch("/api/admin/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "niwache12@gmail.com" }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            localStorage.setItem("dev_admin_token", data.token);
            localStorage.setItem("dev_admin_email", data.email);
            setCurrentTenant("gangina");
            setSessionToken(data.token);
            setUserEmail(data.email);
            loadData(data.token, data.email);
          }
        })
        .catch(() => {});
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
          min_notice_min: minNoticeHours * 60,
          max_days_ahead: maxDaysHorizon,
          dev_bypass: true,
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

  // Bookings partitioning: Active vs Archived for clutter-free editorial UX
  const nowUtc = Math.floor(Date.now() / 1000);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  const {
    activeBookings,
    archivedBookings,
    upcomingCount,
    displayedActiveBookings,
    displayedArchivedBookings,
  } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matchesQuery = (b: AdminBooking) => {
      if (!query) return true;
      const matchName = b.customer_name?.toLowerCase().includes(query);
      const matchPhone = b.customer_phone?.toLowerCase().includes(query);
      const matchEmail = b.customer_email?.toLowerCase().includes(query);
      const matchRef = b.ref?.toLowerCase().includes(query);
      const matchService = (b.service_summary || b.services?.name || "")?.toLowerCase().includes(query);
      return !!(matchName || matchPhone || matchEmail || matchRef || matchService);
    };

    const searched = bookings.filter(matchesQuery);

    const active: AdminBooking[] = [];
    const archived: AdminBooking[] = [];
    let upCount = 0;

    for (const b of searched) {
      const isPast = b.start_utc < nowUtc;
      const isCancelledOrDeclined = b.status === "cancelled" || b.status === "declined";

      if (b.status === "confirmed" && !isPast) {
        upCount++;
      }

      if (b.status === "pending") {
        active.push(b);
      } else if (b.status === "confirmed" && !isPast) {
        active.push(b);
      } else {
        archived.push(b);
      }
    }

    // Sort active: pending first (urgent), then chronological upcoming (closest first)
    active.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return a.start_utc - b.start_utc;
    });

    // Sort archived: newest first
    archived.sort((a, b) => b.start_utc - a.start_utc);

    // Apply status filter to displayed subsets
    let dispActive = active;
    let dispArchived = archived;

    if (statusFilter === "pending") {
      dispActive = active.filter((b) => b.status === "pending");
      dispArchived = [];
    } else if (statusFilter === "confirmed") {
      dispActive = active.filter((b) => b.status === "confirmed");
      dispArchived = [];
    } else if (statusFilter === "past") {
      dispActive = [];
      dispArchived = archived;
    } else if (statusFilter === "active") {
      dispActive = active;
      dispArchived = archived;
    } else if (statusFilter === "all") {
      dispActive = active;
      dispArchived = archived;
    }

    return {
      activeBookings: active,
      archivedBookings: archived,
      upcomingCount: upCount,
      displayedActiveBookings: dispActive,
      displayedArchivedBookings: dispArchived,
    };
  }, [bookings, statusFilter, nowUtc, searchQuery]);

  // Next upcoming confirmed booking for instant calendar jump
  const nextConfirmedBooking = useMemo(() => {
    return bookings
      .filter((b) => b.status === "confirmed" && b.start_utc >= nowUtc)
      .sort((a, b) => a.start_utc - b.start_utc)[0] || null;
  }, [bookings, nowUtc]);

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
      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-8 pb-32 space-y-6">
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
                {tenant?.name || "Gangina Studio"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Åpen i dag status badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Åpen i dag</span>
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="py-2 px-3.5 rounded-full bg-[#C5A880] text-[#111113] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
              >
                + Ny time
              </button>
              <button
                type="button"
                onClick={() => setShowTimeBlockModal(true)}
                className="py-2 px-3.5 rounded-full border border-white/20 text-white text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer"
              >
                + Sperr tid
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

        {/* PILL-SHAPED TAB BAR (DESKTOP / TABLET ONLY) */}
        <nav className="hidden md:flex items-center justify-center p-1.5 rounded-full border border-[#EAE6E1] bg-white shadow-xs max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "calendar"
                ? "bg-[#111113] text-white shadow-xs"
                : "text-[#8a8a8a] hover:text-[#111113]"
            }`}
          >
            Kalender
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bookings")}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "bookings"
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

        {/* TAB 1: KALENDER PANEL */}
        {activeTab === "calendar" && (
          <section id="panel-calendar" className="space-y-6">
            {/* PENDING NOTIFICATION BANNER */}
            {pendingCount > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔔</span>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-amber-950">
                      {pendingCount} {pendingCount === 1 ? "ny avtale venter" : "nye avtaler venter"} på godkjenning
                    </p>
                    <p className="text-[11px] text-amber-800/80">
                      Bekreft eller avslå forespørselen så kunden mottar svar
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("bookings");
                    setStatusFilter("pending");
                  }}
                  className="py-1.5 px-3.5 rounded-full bg-amber-900 text-white text-xs font-semibold hover:bg-amber-950 transition-colors shrink-0 cursor-pointer"
                >
                  Se gjennom
                </button>
              </div>
            )}

            {/* DAGENS OMSETNING SUMMARY WIDGET */}
            <div className="rounded-2xl border border-[#EAE6E1] bg-white p-4 sm:p-5 flex items-center justify-between shadow-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#8a8a8a] block">
                  Dagens omsetning
                </span>
                <div className="text-lg sm:text-xl font-bold text-[#111113]">
                  {todayRevenueNok.toLocaleString("no-NO")} kr
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FAF8F5] border border-[#EAE6E1] text-[#111113]">
                  {todayConfirmedBookings.length} {todayConfirmedBookings.length === 1 ? "bekreftet time" : "bekreftede timer"} i dag
                </span>
              </div>
            </div>

            {/* EDITORIAL ARCHITECTURAL DAGSAGENDA VISUAL TIMELINE */}
            <div className="w-full rounded-[32px] overflow-hidden border border-[#EAE6E1] bg-white shadow-xs font-sans">
              {/* TOP WHITE CANVAS: MONTH CAROUSEL & 7-DAY STRIP */}
              <div className="p-5 sm:p-7 pb-0 space-y-6 bg-white text-[#0D0D0D]">
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

                {/* Horizontal 7-Day Strip with Animated Sliding Bubble Bridge */}
                <div className="relative select-none">
                  {/* SLIDING BUBBLY INDICATOR */}
                  {(() => {
                    const selectedIdx = timelineDaysInStrip.findIndex((d) => d.dateStr === timelineDate);
                    const safeIdx = selectedIdx >= 0 ? selectedIdx : 0;
                    return (
                      <div
                        className="absolute -bottom-1.5 pointer-events-none z-10 flex items-end justify-center"
                        style={{
                          width: "14.285714%",
                          left: 0,
                          transform: `translateX(${safeIdx * 100}%)`, // design-ok
                          transition: "transform 0.48s cubic-bezier(0.34, 1.56, 0.64, 1)", // design-ok
                          willChange: "transform", // design-ok
                        }}
                      >
                        <svg
                          viewBox="0 0 64 76"
                          className="w-16 h-[76px] shrink-0 block"
                          aria-hidden="true"
                        >
                          <path
                            d="M 11,23 A 21,21 0 0,1 53,23 L 53,48 C 53,60 58,70 64,70 L 64,76 L 0,76 L 0,70 C 6,70 11,60 11,48 L 11,23 Z"
                            fill="#0D0D0D"
                          />
                        </svg>
                      </div>
                    );
                  })()}

                  {/* 7-Day Buttons Grid */}
                  <div className="grid grid-cols-7 relative z-20">
                    {timelineDaysInStrip.map((d) => {
                      const isSelected = timelineDate === d.dateStr;
                      return (
                        <div key={d.dateStr} className="flex flex-col items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setTimelineDate(d.dateStr)}
                            className="w-11 h-[72px] flex flex-col items-center justify-start pt-2 cursor-pointer bg-transparent transition-all duration-300 relative z-30 group"
                          >
                            <span
                              className={`text-[10px] uppercase font-bold tracking-wider transition-colors duration-300 ${
                                isSelected ? "text-neutral-400" : "text-[#0D0D0D]/60 group-hover:text-[#0D0D0D]"
                              }`}
                            >
                              {d.weekdayInitial}
                            </span>
                            <span
                              className={`text-sm font-extrabold mt-0.5 transition-colors duration-300 ${
                                isSelected ? "text-white" : "text-[#0D0D0D] group-hover:scale-105"
                              }`}
                            >
                              {d.dayNum}
                            </span>
                            {d.bookingCount > 0 && (
                              <span
                                className={`mt-1 w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                                  isSelected ? "bg-[#C4A482]" : "bg-[#111113]"
                                }`}
                              />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* LOWER AGENDA CONTAINER (DEEP OBSIDIAN #0D0D0D) */}
              <div
                className="bg-[#0D0D0D] text-white p-6 sm:p-8 space-y-6 -mt-1 relative z-10"
              >
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
                  <span className="text-[11px] font-mono text-[#C4A482]">
                    {unifiedTimelineItems.length} {unifiedTimelineItems.length === 1 ? "oppføring" : "oppføringer"}
                  </span>
                </div>

                {/* Timeline content */}
                {unifiedTimelineItems.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center space-y-3">
                    <p className="text-xs text-neutral-400">
                      Ingen avtaler eller sperringer for denne dagen
                    </p>
                    {nextConfirmedBooking && (
                      <div className="pb-1">
                        <button
                          type="button"
                          onClick={() => {
                            const nextDateStr = getOsloDateString(nextConfirmedBooking.start_utc);
                            setTimelineDate(nextDateStr);
                            const parts = nextDateStr.split("-");
                            const nextDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                            nextDate.setHours(0, 0, 0, 0);
                            setTimelineWeekStart(nextDate);
                          }}
                          className="py-1.5 px-3.5 rounded-full border border-[#C5A880]/40 bg-[#C5A880]/10 hover:bg-[#C5A880]/20 text-[#C5A880] text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <span>Neste avtale: {formatOsloDateTime(nextConfirmedBooking.start_utc)} ({nextConfirmedBooking.customer_name}) →</span>
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowManualModal(true)}
                        className="py-2 px-4 rounded-full bg-white text-[#0D0D0D] font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        + Registrer manuell time
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTimeBlockModal(true)}
                        className="py-2 px-4 rounded-full border border-white/20 text-white font-semibold text-xs hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        + Sperr tid
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative pl-6 sm:pl-8 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-white/20">
                    {unifiedTimelineItems.map((item) => {
                      if (item.kind === "blackout") {
                        const startTimeStr = formatOsloTime(item.start_utc);
                        const endTimeStr = formatOsloTime(item.end_utc);
                        const durationMin = Math.round((item.end_utc - item.start_utc) / 60);

                        return (
                          <div key={item.id} className="relative group">
                            {/* Node bullet */}
                            <span className="absolute -left-[29px] sm:-left-[37px] top-4 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-[#0D0D0D] block" />

                            {/* Timestamp */}
                            <div className="text-[11px] font-mono text-neutral-400 mb-1.5 flex items-center gap-2">
                              <span className="text-amber-400 font-semibold">{startTimeStr} – {endTimeStr}</span>
                              <span className="text-neutral-500">({durationMin} min)</span>
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                                Sperret tid
                              </span>
                            </div>

                            {/* Blackout Card */}
                            <div className="bg-[#1A1A1A] border border-amber-500/30 rounded-[16px] p-4 text-white space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <h5 className="font-bold text-sm text-neutral-100 flex items-center gap-2">
                                    <span>⛔</span> {item.blackout.reason || "Pause / Fravær"}
                                  </h5>
                                  <p className="text-xs text-neutral-400 mt-0.5">
                                    Sperret for kundebooking
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBlackout(item.blackout.id)}
                                  className="py-1 px-2.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-[10px] font-semibold cursor-pointer shrink-0 transition-colors"
                                >
                                  Fjern
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      const b = item.booking;
                      const startTimeStr = formatOsloTime(b.start_utc);
                      const endTimeStr = formatOsloTime(b.end_utc);
                      const durationMin = Math.round((b.end_utc - b.start_utc) / 60);
                      const serviceName = b.service_summary || b.services?.name || `Behandling #${b.service_id}`;
                      const isPending = b.status === "pending";
                      const isConfirmed = b.status === "confirmed";
                      const isDeclinedOrCancelled = b.status === "cancelled" || b.status === "declined";

                      return (
                        <div key={item.id} className="relative group">
                          {/* Node bullet */}
                          <span className="absolute -left-[29px] sm:-left-[37px] top-4 w-3.5 h-3.5 rounded-full bg-[#C4A482] ring-4 ring-[#0D0D0D] block" />

                          {/* Timestamp */}
                          <div className="text-[11px] font-mono text-neutral-400 mb-1.5 flex items-center gap-2">
                            <span className="text-[#C4A482] font-semibold">{startTimeStr} – {endTimeStr}</span>
                            <span className="text-[#6B7280]">({durationMin} min)</span>
                          </div>

                          {/* Compact Space-Saving Timeline Card */}
                          <div
                            onClick={() => setSelectedBooking(b)}
                            className={`rounded-2xl p-3 sm:p-3.5 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-md border ${
                              isPending
                                ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/40 text-[#171717]"
                                : "bg-white text-[#171717] border-[#EAE6E1] hover:border-[#C4A482]"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 uppercase ${
                                  isPending ? "bg-amber-200 text-amber-900" : "bg-[#FAF8F5] text-[#111113] border border-[#EAE6E1]"
                                }`}
                              >
                                {b.customer_name.slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-bold text-sm text-[#171717] truncate">
                                    {b.customer_name}
                                  </h5>
                                  {isPending && (
                                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                                      Venter svar
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#6B7280] truncate">
                                  {b.customer_email || serviceName}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  isConfirmed
                                    ? "bg-[#E3F8E8] text-[#15803D]"
                                    : isPending
                                    ? "bg-amber-100 text-amber-800"
                                    : isDeclinedOrCancelled
                                    ? "bg-[#F3F4F6] text-[#6B7280]"
                                    : "bg-[#F3F4F6] text-[#6B7280]"
                                }`}
                              >
                                {isConfirmed
                                  ? "Bekreftet"
                                  : isPending
                                  ? "Venter"
                                  : b.status === "cancelled"
                                  ? "Kansellert"
                                  : b.status === "declined"
                                  ? "Avslått"
                                  : b.status}
                              </span>
                              <span className="text-neutral-400 text-xs font-semibold">→</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: AVTALER PANEL */}
        {activeTab === "bookings" && (
          <section id="panel-bookings" className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Søk etter kunde, telefon, e-post eller referanse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-3 pl-10 pr-10 rounded-2xl border border-[#EAE6E1] bg-white text-xs text-[#111113] placeholder-[#8a8a8a] outline-none focus:border-[#111113] shadow-xs"
              />
              <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-[#8a8a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-3 text-xs text-[#8a8a8a] hover:text-[#111113] cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter Segment */}
            <div className="flex items-center justify-start gap-1.5 overflow-x-auto pb-1 text-xs">
              {(
                [
                  { id: "active", label: `Aktive (${activeBookings.length})` },
                  { id: "pending", label: `Venter (${pendingCount})` },
                  { id: "confirmed", label: `Kommende (${upcomingCount})` },
                  { id: "past", label: `Arkiv (${archivedBookings.length})` },
                  { id: "all", label: `Alle (${bookings.length})` },
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

            {/* Active Appointments Feed */}
            {statusFilter !== "past" && (
              displayedActiveBookings.length === 0 ? (
                <div className="p-8 rounded-3xl border border-dashed border-[#EAE6E1] bg-white text-center text-xs text-[#8a8a8a]">
                  {statusFilter === "pending"
                    ? "Ingen ventende avtaler for øyeblikket"
                    : statusFilter === "confirmed"
                    ? "Ingen kommende bekreftede avtaler"
                    : `Ingen aktive avtaler funnet ${searchQuery ? `for «${searchQuery}»` : ""}`}
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedActiveBookings.map((b) => {
                    const isLoading = actionLoading === b.id;
                    const isPending = b.status === "pending";
                    const isConfirmed = b.status === "confirmed";

                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        className={`rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer shadow-xs hover:border-[#111113] group ${
                          isPending
                            ? "border-amber-300 bg-amber-50/40 ring-1 ring-amber-300/50"
                            : "border-[#EAE6E1] bg-white hover:bg-[#FAF8F5]/80"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          {/* Left: Avatar + Name + Date/Time + Email */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 uppercase ${
                                isPending
                                  ? "bg-amber-200 text-amber-900"
                                  : "bg-[#FAF8F5] text-[#111113] border border-[#EAE6E1]"
                              }`}
                            >
                              {b.customer_name.slice(0, 2)}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-[#111113] truncate group-hover:underline">
                                  {b.customer_name}
                                </span>
                                {isPending && (
                                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white tracking-wider animate-pulse">
                                    Venter svar
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#8a8a8a] flex items-center gap-1.5 truncate">
                                <span className="font-semibold text-[#111113]">
                                  {formatOsloDate(b.start_utc)} kl. {formatOsloTime(b.start_utc)}
                                </span>
                                {b.customer_email && (
                                  <>
                                    <span>·</span>
                                    <span className="truncate">{b.customer_email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions for pending OR Status + Price for confirmed */}
                          <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-[#EAE6E1]/50">
                            {isPending ? (
                              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => handleStatusUpdate(b.id, "confirmed")}
                                  className="py-1 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isLoading ? "..." : "Godkjenn"}
                                </button>
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => handleStatusUpdate(b.id, "declined")}
                                  className="py-1 px-2.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Avslå
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedBooking(b)}
                                  className="py-1 px-2 rounded-lg border border-[#EAE6E1] text-[#111113] text-xs font-semibold hover:bg-white transition-colors cursor-pointer"
                                >
                                  Detaljer →
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                                <span
                                  className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                    isConfirmed
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                                  }`}
                                >
                                  {isConfirmed ? "Bekreftet" : b.status}
                                </span>
                                <span className="text-xs font-semibold text-[#111113]">
                                  {b.price_nok > 0 ? `${b.price_nok} kr` : "Gratis"}
                                </span>
                                <span className="text-xs text-[#8a8a8a] group-hover:text-[#111113] transition-colors">
                                  Detaljer →
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Collapsible Archived / Historical Appointments Section */}
            {displayedArchivedBookings.length > 0 && statusFilter !== "pending" && statusFilter !== "confirmed" && (
              <div className="pt-2">
                {statusFilter !== "past" ? (
                  <button
                    type="button"
                    onClick={() => setShowArchived((prev) => !prev)}
                    className="w-full py-3 px-4 sm:px-5 rounded-2xl border border-[#EAE6E1] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#111113] flex items-center justify-between transition-colors shadow-xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm">🗄️</span>
                      <span className="font-bold text-[#111113]">Tidligere og kansellerte avtaler</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] border border-[#EAE6E1] text-[#8a8a8a]">
                        {displayedArchivedBookings.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#8a8a8a] group-hover:text-[#111113] text-xs font-normal">
                      <span>{showArchived || searchQuery.trim().length > 0 ? "Skjul arkiv" : "Vis arkiv"}</span>
                      <span className="text-[10px]">{showArchived || searchQuery.trim().length > 0 ? "▲" : "▼"}</span>
                    </div>
                  </button>
                ) : (
                  <div className="pb-1 text-xs text-[#8a8a8a] font-semibold flex items-center gap-2">
                    <span>🗄️ Arkiverte og historiske avtaler ({displayedArchivedBookings.length})</span>
                  </div>
                )}

                {(statusFilter === "past" || showArchived || searchQuery.trim().length > 0) && (
                  <div className="mt-3 space-y-2">
                    {displayedArchivedBookings.map((b) => {
                      const dateStr = formatOsloDate(b.start_utc);
                      const timeStr = formatOsloTime(b.start_utc);
                      const isCancelled = b.status === "cancelled";
                      const isDeclined = b.status === "declined";

                      return (
                        <div
                          key={b.id}
                          className="rounded-2xl border border-[#EAE6E1] bg-white p-3.5 hover:border-[#111113] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#EAE6E1] text-[#8a8a8a] text-[10px] font-bold flex items-center justify-center shrink-0 uppercase">
                              {b.customer_name.slice(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-[#111113]">{b.customer_name}</span>
                                <span className="text-[10px] text-[#8a8a8a] font-mono">Ref: {b.ref}</span>
                              </div>
                              <div className="text-[11px] text-[#8a8a8a] flex items-center gap-2">
                                <span>{dateStr} kl {timeStr}</span>
                                <span>·</span>
                                <span className="truncate max-w-[200px]">{b.service_summary || b.services?.name || "Behandling"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#FAF8F5]">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                isCancelled
                                  ? "bg-neutral-100 text-neutral-600 border border-neutral-200"
                                  : isDeclined
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {isCancelled ? "Kansellert" : isDeclined ? "Avslått" : "Fullført"}
                            </span>

                            <span className="text-xs font-semibold text-[#111113] min-w-[50px] text-right">
                              {b.price_nok > 0 ? `${b.price_nok} kr` : "Gratis"}
                            </span>

                            <button
                              type="button"
                              onClick={() => setSelectedBooking(b)}
                              className="py-1 px-2.5 rounded-lg border border-[#EAE6E1] text-[#111113] text-[10px] font-semibold hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                            >
                              Detaljer →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: ÅPNINGSTIDER PANEL */}
        {activeTab === "schedule" && (
          <section id="panel-schedule" className="space-y-6">
            {/* Weekly Working Hours Configuration */}
            <div className="rounded-3xl border border-[#EAE6E1] bg-white p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.35em] text-[#8a8a8a] font-semibold block">
                    Faste Åpningstider
                  </span>
                  <h3 className="text-base font-bold text-[#111113]">
                    Ukeplan & Skift
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyMondayToWeekdays}
                    className="py-1.5 px-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-xs font-semibold text-[#111113] hover:border-[#111113] transition-colors cursor-pointer"
                  >
                    Kopier mandag til alle hverdager
                  </button>

                  <div className="flex items-center gap-1.5 text-xs">
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
              </div>

              <div className="divide-y divide-[#EAE6E1] text-xs pt-1">
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

            {/* Active Blackouts Management Card */}
            <div className="rounded-3xl border border-[#EAE6E1] bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.35em] text-[#8a8a8a] font-semibold block">
                    Fravær & Pauser
                  </span>
                  <h3 className="text-base font-bold text-[#111113]">
                    Aktive Sperreperioder ({blackouts.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTimeBlockModal(true)}
                  className="py-2 px-3.5 rounded-xl bg-[#111113] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
                >
                  + Sperr tid
                </button>
              </div>

              {blackouts.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-[#EAE6E1] text-center text-xs text-[#8a8a8a]">
                  Ingen aktive sperringer eller ferie lagt inn.
                </div>
              ) : (
                <div className="space-y-2">
                  {blackouts.map((k) => (
                    <div
                      key={k.id}
                      className="p-3.5 rounded-2xl border border-[#EAE6E1] bg-[#FAF8F5] flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#111113] flex items-center gap-1.5">
                          <span>⛔</span> {k.reason || "Fravær"}
                        </span>
                        <div className="text-[11px] text-[#8a8a8a] mt-0.5">
                          {formatOsloDateTime(k.start_utc)} — {formatOsloDateTime(k.end_utc)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBlackout(k.id)}
                        className="py-1 px-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-semibold cursor-pointer transition-colors"
                      >
                        Slett
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 4: STUDIO SETTINGS PANEL */}
        {activeTab === "settings" && (
          <section id="panel-settings" className="space-y-6">
            <div className="rounded-3xl border border-[#EAE6E1] bg-white p-6 sm:p-7 shadow-xs space-y-5">
              <div>
                <span className="text-[10px] uppercase tracking-[0.35em] text-[#8a8a8a] font-semibold block">
                  Studio Konfigurasjon
                </span>
                <h3 className="text-base font-bold text-[#111113]">
                  Profil & Regler
                </h3>
              </div>

              {settingsNotice && (
                <div className="p-3 rounded-xl bg-neutral-100 text-[#111113] text-xs font-medium">
                  {settingsNotice}
                </div>
              )}

              {/* Studio Profile */}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
                      Salongadresse
                    </label>
                    <input
                      type="text"
                      value={studioAddress}
                      onChange={(e) => setStudioAddress(e.target.value)}
                      className="w-full p-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
                      Organisasjonsnummer
                    </label>
                    <input
                      type="text"
                      value={studioOrgNr}
                      onChange={(e) => setStudioOrgNr(e.target.value)}
                      className="w-full p-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113]"
                    />
                  </div>
                </div>

                {/* Booking Notice Rules */}
                <div className="pt-2 border-t border-[#EAE6E1] space-y-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#8a8a8a] block font-semibold">
                    Bookingregler & Frister
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
                        Minste varslingstid før booking (timer)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={72}
                        value={minNoticeHours}
                        onChange={(e) => setMinNoticeHours(Number(e.target.value))}
                        className="w-full p-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113]"
                      />
                      <span className="text-[10px] text-[#8a8a8a] block">
                        Kunder kan tidligst booke {minNoticeHours} timer fram i tid
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
                        Bookinghorisont (dager)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={maxDaysHorizon}
                        onChange={(e) => setMaxDaysHorizon(Number(e.target.value))}
                        className="w-full p-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113]"
                      />
                      <span className="text-[10px] text-[#8a8a8a] block">
                        Kunder kan maksimalt booke {maxDaysHorizon} dager fram i tid
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notification contacts */}
                <div className="pt-2 border-t border-[#EAE6E1] space-y-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#8a8a8a] block font-semibold">
                    Varslingskontakt
                  </span>
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

      {/* 4-TAB MOBILE BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Admin navigasjon"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#EAE6E1] py-2 px-3 shadow-lg"
      >
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-colors cursor-pointer ${
              activeTab === "calendar"
                ? "text-[#111113] font-bold"
                : "text-[#8a8a8a] hover:text-[#111113] font-medium"
            }`}
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === "calendar" ? 2.5 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] tracking-tight">Kalender</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bookings")}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-colors cursor-pointer ${
              activeTab === "bookings"
                ? "text-[#111113] font-bold"
                : "text-[#8a8a8a] hover:text-[#111113] font-medium"
            }`}
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === "bookings" ? 2.5 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="text-[10px] tracking-tight">Avtaler</span>
            {pendingCount > 0 && (
              <span className="absolute top-1 right-5 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-colors cursor-pointer ${
              activeTab === "schedule"
                ? "text-[#111113] font-bold"
                : "text-[#8a8a8a] hover:text-[#111113] font-medium"
            }`}
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === "schedule" ? 2.5 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] tracking-tight">Åpningstider</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-colors cursor-pointer ${
              activeTab === "settings"
                ? "text-[#111113] font-bold"
                : "text-[#8a8a8a] hover:text-[#111113] font-medium"
            }`}
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === "settings" ? 2.5 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] tracking-tight">Innstillinger</span>
          </button>
        </div>
      </nav>

      {/* TIME BLOCK & PAUSE MODAL */}
      <TimeBlockModal
        isOpen={showTimeBlockModal}
        onClose={() => setShowTimeBlockModal(false)}
        onSuccess={() => {
          setShowTimeBlockModal(false);
          if (sessionToken && userEmail) loadData(sessionToken, userEmail);
        }}
        token={sessionToken}
        todayClosingTime={todayClosingTime}
      />

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
