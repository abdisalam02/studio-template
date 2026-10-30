"use client";

import React, { useEffect, useState, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import "./admin-system.css";

// Sanzo Wada 1930s 'A Dictionary of Color Combinations' Presets
const THEME_PRESETS = [
  { id: "wada-kurokin", name: "Kuro-Kin", accent: "#C4A482", canopy: "#121214", sheet: "#FAFAFA", desc: "Sumi & Antique Gold" },
  { id: "wada-kurikoge", name: "Kuri-Koge", accent: "#C86D51", canopy: "#1C1917", sheet: "#FBF9F7", desc: "Chestnut & Terracotta" },
  { id: "wada-sabiseiji", name: "Sabi-Seiji", accent: "#7E9F85", canopy: "#131F17", sheet: "#F6F8F5", desc: "Deep Forest & Celadon" },
  { id: "wada-edomurasaki", name: "Edo-Murasaki", accent: "#9285B4", canopy: "#151724", sheet: "#F7F7FA", desc: "Midnight & Iris" },
  { id: "wada-rikyucha", name: "Rikyū-cha", accent: "#A49767", canopy: "#1A1C16", sheet: "#F8F7F3", desc: "Dark Tea & Brass" },
  { id: "wada-benitobi", name: "Beni-tobi", accent: "#D96B6B", canopy: "#1E1718", sheet: "#FAF6F6", desc: "Dark Iron & Akane Coral" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface BookingRecord {
  ref: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  service_name: string;
  service_price?: number;
  duration_min?: number;
  scheduled_at: string;
  status: "confirmed" | "pending" | "declined" | "cancelled";
  notes?: string;
  email_status?: string;
  email_error?: string;
}

interface TenantProfile {
  id: string;
  name: string;
  tagline?: string;
  monogram?: string;
  logo_url?: string;
  palette?: {
    accent?: string;
    canopy?: string;
    sheet?: string;
    preset?: string;
  };
  owner_email?: string;
  contact_email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  org_number?: string;
}

const EMPTY_TENANT_PROFILE: TenantProfile = {
  id: "",
  name: "",
  monogram: "",
  tagline: "Studio Manager",
};

const KNOWN_TENANT_LOOKUP: Record<string, { id: string; name: string; logo_url: string; monogram: string; tagline: string }> = {
  "niwache12@gmail.com": { id: "gangina", name: "by Gangina", logo_url: "/img/logo-chrome.png", monogram: "G", tagline: "Tooth Gems & Grillz" },
  "niwache15@gmail.com": { id: "gangina", name: "by Gangina", logo_url: "/img/logo-chrome.png", monogram: "G", tagline: "Tooth Gems & Grillz" },
  "ganginabeauty@gmail.com": { id: "gangina", name: "by Gangina", logo_url: "/img/logo-chrome.png", monogram: "G", tagline: "Tooth Gems & Grillz" },
};
const LOOKUP_MEMORY_CACHE = new Map<string, { id: string; name: string; logo_url: string; monogram: string; tagline: string } | null>();

interface EditorialTimePickerProps {
  value: string;
  onChange: (val: string) => void;
  id?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

function EditorialTimePicker({ value, onChange, id, style, disabled }: EditorialTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [typedText, setTypedText] = useState(value || "09:00");

  useEffect(() => {
    setTypedText(value || "09:00");
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedText(val);

    const digitsOnly = val.replace(/\D/g, "");
    if (digitsOnly.length === 4) {
      const hh = Math.min(23, Math.max(0, Number(digitsOnly.slice(0, 2))));
      const mm = Math.min(59, Math.max(0, Number(digitsOnly.slice(2, 4))));
      const formatted = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      setTypedText(formatted);
      onChange(formatted);
    } else if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(val)) {
      onChange(val);
    }
  };

  const handleBlur = () => {
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(typedText)) {
      setTypedText(value || "09:00");
    }
  };

  const adjustMinutes = (delta: number) => {
    const [hh, mm] = (value || "09:00").split(":").map(Number);
    const totalMin = ((hh || 0) * 60 + (mm || 0) + delta + 1440) % 1440;
    const newH = Math.floor(totalMin / 60);
    const newM = totalMin % 60;
    const formatted = `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
    onChange(formatted);
    setTypedText(formatted);
  };

  const TIME_PRESETS = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
  ];

  return (
    <div className="editorial-time-picker-wrapper" style={style}>
      <div className={`editorial-time-pill ${isOpen ? "is-focused" : ""}`}>
        <span className="editorial-time-clock-icon" aria-hidden="true">⏱</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          className="editorial-time-raw-input"
          value={typedText}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder="HH:mm"
          maxLength={5}
          disabled={disabled}
        />
        <button
          type="button"
          className="editorial-time-toggle-btn"
          aria-label="Toggle time picker"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          tabIndex={-1}
        >
          ▾
        </button>
      </div>

      {isOpen && (
        <>
          <div className="editorial-time-backdrop" onClick={() => setIsOpen(false)} />
          <div className="editorial-time-popover">
            <div className="editorial-time-steppers">
              <button type="button" onClick={() => adjustMinutes(-60)} className="time-stepper-btn">-1h</button>
              <button type="button" onClick={() => adjustMinutes(-15)} className="time-stepper-btn">-15m</button>
              <span className="time-stepper-display">{value || "09:00"}</span>
              <button type="button" onClick={() => adjustMinutes(15)} className="time-stepper-btn">+15m</button>
              <button type="button" onClick={() => adjustMinutes(60)} className="time-stepper-btn">+1h</button>
            </div>
            <div className="editorial-time-chips">
              {TIME_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`editorial-time-chip ${value === t ? "active" : ""}`}
                  onClick={() => {
                    onChange(t);
                    setTypedText(t);
                    setIsOpen(false);
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const DEFAULT_SHIFTS: Record<string, { open: boolean; start: string; end: string }> = {
  Monday: { open: true, start: "09:00", end: "17:00" },
  Tuesday: { open: true, start: "09:00", end: "17:00" },
  Wednesday: { open: true, start: "09:00", end: "17:00" },
  Thursday: { open: true, start: "09:00", end: "17:00" },
  Friday: { open: true, start: "09:00", end: "17:00" },
  Saturday: { open: false, start: "10:00", end: "15:00" },
  Sunday: { open: false, start: "10:00", end: "15:00" },
};

function makeDefaultShifts(): Record<string, { open: boolean; start: string; end: string }> {
  return Object.fromEntries(
    Object.entries(DEFAULT_SHIFTS).map(([day, shift]) => [day, { ...shift }])
  );
}

function AdminPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // No implicit tenant: pre-login branding is resolved from the email, and the
  // authenticated session is authoritative afterwards.
  const tenantParam = searchParams.get("tenant") || "";

  // Auth & Session
  const [session, setSession] = useState<{
    authenticated: boolean;
    email?: string;
    tenant_id?: string;
    scope?: string;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [authStatus, setAuthStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  const isLocked = authStatus !== "authenticated";
  const setIsLocked = (locked: boolean) => setAuthStatus(locked ? "unauthenticated" : "authenticated");
  const [loginStep, setLoginStep] = useState<"email" | "code">("email");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const lookupTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Tenant & Branding
  const [activeTenant, setActiveTenant] = useState<string>(tenantParam);
  const [tenantList, setTenantList] = useState<{ id: string; name: string }[]>([]);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile>(EMPTY_TENANT_PROFILE);
  const [activeTheme, setActiveTheme] = useState("wada-kurokin");

  // Navigation & Views
  const [activeTab, setActiveTab] = useState<"kalender" | "avtaler" | "schedule" | "settings">("kalender");
  const [selectedDate, setSelectedDate] = useState<string>("2026-10-30");
  const [viewYear, setViewYear] = useState<number>(2026);
  const [viewMonth, setViewMonth] = useState<number>(9); // 0-indexed (9 = October)
  const [calendarMode, setCalendarMode] = useState<"week" | "month">("week");
  const [searchFilter, setSearchFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<"active" | "pending" | "confirmed" | "archive" | "all">("active");
  const [archiveExpanded, setArchiveExpanded] = useState(false);
  const [isInitialDataLoading, setIsInitialDataLoading] = useState(true);

  // Calendar mathematical helpers
  function getWeekDaysForDate(dateStr: string) {
    const parts = dateStr.split("-").map(Number);
    const y = parts[0] || 2026;
    const m = (parts[1] || 10) - 1;
    const d = parts[2] || 30;
    const curr = new Date(Date.UTC(y, m, d));
    const day = curr.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(Date.UTC(y, m, d + diff));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i));
      const iso = dayDate.toISOString().split("T")[0];
      week.push({
        name: WEEKDAYS[i],
        num: dayDate.getUTCDate(),
        iso,
        month: dayDate.getUTCMonth(),
        year: dayDate.getUTCFullYear(),
      });
    }
    return week;
  }

  function getMonthGridDays(year: number, month: number) {
    const firstDay = new Date(Date.UTC(year, month, 1));
    const firstDayOfWeek = firstDay.getUTCDay();
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const daysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const cells = [];
    const totalCells = offset + daysInMonth > 35 ? 42 : 35;

    for (let i = 0; i < totalCells; i++) {
      if (i < offset) {
        const prevDay = daysInPrevMonth - offset + i + 1;
        const prevDate = new Date(Date.UTC(year, month - 1, prevDay));
        cells.push({
          dayNum: prevDay,
          iso: prevDate.toISOString().split("T")[0],
          isCurrentMonth: false,
          month: prevDate.getUTCMonth(),
          year: prevDate.getUTCFullYear(),
        });
      } else if (i < offset + daysInMonth) {
        const dayNum = i - offset + 1;
        const currDate = new Date(Date.UTC(year, month, dayNum));
        cells.push({
          dayNum,
          iso: currDate.toISOString().split("T")[0],
          isCurrentMonth: true,
          month: currDate.getUTCMonth(),
          year: currDate.getUTCFullYear(),
        });
      } else {
        const nextDay = i - offset - daysInMonth + 1;
        const nextDate = new Date(Date.UTC(year, month + 1, nextDay));
        cells.push({
          dayNum: nextDay,
          iso: nextDate.toISOString().split("T")[0],
          isCurrentMonth: false,
          month: nextDate.getUTCMonth(),
          year: nextDate.getUTCFullYear(),
        });
      }
    }
    return cells;
  }

  function normalizeBooking(raw: any): BookingRecord {
    let iso = "";
    if (raw.scheduled_at) {
      iso = raw.scheduled_at;
    } else if (raw.start_utc) {
      const epochMs = typeof raw.start_utc === "number" ? (raw.start_utc < 1e11 ? raw.start_utc * 1000 : raw.start_utc) : Date.parse(raw.start_utc);
      iso = new Date(epochMs).toISOString();
    } else if (raw.created_at) {
      iso = new Date(raw.created_at).toISOString();
    }

    return {
      ref: raw.ref || raw.reference || `REF-${Math.floor(Math.random() * 9000 + 1000)}`,
      client_name: raw.client_name || raw.customer_name || raw.name || "Client",
      client_email: raw.client_email || raw.customer_email || raw.email || "",
      client_phone: raw.client_phone || raw.customer_phone || raw.phone || "",
      service_name: raw.service_name || raw.services?.name || raw.treatment_name || "Studio Treatment",
      service_price: typeof raw.service_price === "number" ? raw.service_price : (typeof raw.price_nok === "number" ? raw.price_nok : 850),
      duration_min: raw.duration_min || raw.services?.duration_min || raw.duration || 45,
      scheduled_at: iso,
      status: raw.status || "confirmed",
      notes: raw.notes || "",
      email_status: raw.email_status || "delivered",
      email_error: raw.email_error || "",
    };
  }

  // Data Caches
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [shifts, setShifts] = useState<Record<string, { open: boolean; start: string; end: string }>>(makeDefaultShifts);
  const [blackouts, setBlackouts] = useState<any[]>([]);
  const [slotInterval, setSlotInterval] = useState("30");

  // Modals & Drawers
  const [activeDrawerBooking, setActiveDrawerBooking] = useState<BookingRecord | null>(null);
  const drawerDragControls = useDragControls();

  // Parse notes to cleanly isolate intake fields (e.g. [placement]: Upper Canine) from customer remarks
  const { cleanRemarks, customPlacement } = React.useMemo(() => {
    const rawNotes = activeDrawerBooking?.notes || "";
    let placement: string | null = null;
    const clean = rawNotes
      .replace(/\[(?:placement|tooth_placement)\]:\s*([^\n\r|]+)/i, (_, val) => {
        placement = val.trim();
        return "";
      })
      .replace(/\|\s*\|/g, "")
      .replace(/^[\s|]+|[\s|]+$/g, "")
      .trim();
    return { cleanRemarks: clean, customPlacement: placement };
  }, [activeDrawerBooking?.notes]);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCustomThemeSheet, setShowCustomThemeSheet] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Action Pending & Saving Loaders
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);
  const [triageActionRef, setTriageActionRef] = useState<string | null>(null);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("12:00");

  // Plan Ahead Date Overrides State
  const [scheduleSubTab, setScheduleSubTab] = useState<"weekly" | "plan_ahead">("weekly");
  const [dateOverrides, setDateOverrides] = useState<Record<string, { open: boolean; start?: string; end?: string; shifts?: { start: string; end: string }[] }>>({});
  const [planAheadYear, setPlanAheadYear] = useState(() => new Date().getUTCFullYear());
  const [planAheadMonth, setPlanAheadMonth] = useState(() => new Date().getUTCMonth());
  const [selectedPlanDates, setSelectedPlanDates] = useState<string[]>([]);
  const [planCustomStart, setPlanCustomStart] = useState("09:00");
  const [planCustomEnd, setPlanCustomEnd] = useState("17:00");
  const [planIsClosed, setPlanIsClosed] = useState(false);
  const [isCustomizingDates, setIsCustomizingDates] = useState(false);
  const [perDateCustomTimes, setPerDateCustomTimes] = useState<Record<string, { open: boolean; start: string; end: string }>>({});
  const [blockStartTime, setBlockStartTime] = useState("13:00");

  // New Booking Form State
  const [servicesList, setServicesList] = useState<{ id: number | string; name: string; price_nok: number; duration_min: number }[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newService, setNewService] = useState("18k Gold Tooth Gem · Upper Canine");
  const [newPrice, setNewPrice] = useState(850);
  const [newDuration, setNewDuration] = useState(45);
  const [newDate, setNewDate] = useState("2026-10-30");
  const [newTime, setNewTime] = useState("12:00");

  // Custom Theme State
  const [draftCustomAccent, setDraftCustomAccent] = useState("#C4A482");
  const [draftCustomCard, setDraftCustomCard] = useState("#18181B");
  const [draftCustomCanvas, setDraftCustomCanvas] = useState("#0A0A0A");

  // Mock Sandbox Tenant Data (Realistic Oslo Studio Appointments)
  const MOCK_DEMO_BOOKINGS: BookingRecord[] = [
    {
      ref: "NOI-1092",
      client_name: "Ingrid Solberg",
      client_email: "ingrid.solberg@icloud.com",
      client_phone: "+47 912 34 567",
      service_name: "18k Gold Tooth Gem · Upper Canine",
      service_price: 850,
      duration_min: 45,
      scheduled_at: "2026-10-30T09:30:00",
      status: "confirmed",
      notes: "Wants subtle placement on right canine, first time client.",
      email_status: "delivered",
    },
    {
      ref: "NOI-1093",
      client_name: "Marcus Lindqvist",
      client_email: "marcus.l@gmail.com",
      client_phone: "+47 456 78 901",
      service_name: "Custom Silver Single Cap · Fitting & Mold",
      service_price: 1900,
      duration_min: 60,
      scheduled_at: "2026-10-30T11:00:00",
      status: "pending",
      notes: "Bringing reference photo for star cutout.",
      email_status: "bounced",
      email_error: "Recipient mailbox does not exist (550 5.1.1)",
    },
    {
      ref: "NOI-1094",
      client_name: "Sana Al-Mansoor",
      client_email: "sana.m@outlook.com",
      client_phone: "+47 987 65 432",
      service_name: "Swarovski Crystal Trio · Smile Line",
      service_price: 1150,
      duration_min: 45,
      scheduled_at: "2026-10-30T13:30:00",
      status: "pending",
      notes: "Express booking during work break.",
      email_status: "delivered",
    },
    {
      ref: "NOI-1095",
      client_name: "Emilie Haugen",
      client_email: "emilie.h@vipps.no",
      client_phone: "+47 411 22 334",
      service_name: "White Gold Butterfly Gem",
      service_price: 950,
      duration_min: 45,
      scheduled_at: "2026-10-29T15:00:00",
      status: "confirmed",
      notes: "Returning customer from last month.",
      email_status: "delivered",
    },
    {
      ref: "NOI-1096",
      client_name: "Kasper Nymo",
      client_email: "kasper.nymo@gmail.com",
      client_phone: "+47 922 88 110",
      service_name: "Deep Clean & Gem Replacement",
      service_price: 650,
      duration_min: 60,
      scheduled_at: "2026-10-29T16:30:00",
      status: "confirmed",
      notes: "Requested gentle cleaning around canine.",
      email_status: "delivered",
    },
    {
      ref: "NOI-1097",
      client_name: "Henrik Vanger",
      client_email: "henrik.v@dn.no",
      client_phone: "+47 901 12 345",
      service_name: "18k Gold Tooth Gem · Upper Canine",
      service_price: 850,
      duration_min: 45,
      scheduled_at: "2026-10-28T11:30:00",
      status: "confirmed",
      notes: "Confirmed VIP appointment.",
      email_status: "delivered",
    },
    {
      ref: "NOI-1098",
      client_name: "Astrid Lind",
      client_email: "astrid.l@nrk.no",
      client_phone: "+47 955 44 332",
      service_name: "Custom Silver Single Cap · Fitting & Mold",
      service_price: 1900,
      duration_min: 60,
      scheduled_at: "2026-10-31T12:00:00",
      status: "confirmed",
      notes: "Saturday session.",
      email_status: "delivered",
    },
  ];

  function getCleanStudioName(id: string, name: string): string {
    if (id === "gangina" || /gangina/i.test(name)) return "Gangina";
    if (id === "noire" || /noire/i.test(name)) return "Noire";
    if (id === "studio-klo" || /kl[oō]/i.test(name)) return "Studio Klō";
    if (id === "demo-studio" || /demo/i.test(name)) return "Atelier Demo";
    return (name || id).replace(/\s*(Beauty|Studio|Haute|Esthétique|Salon|Atelier|Spa).*$/i, "").trim() || name;
  }

  function formatEnglishDate(dateStr?: string): string {
    if (!dateStr) return "October 30, 2026";
    try {
      const parts = dateStr.split("T")[0].split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
      }
      return dateStr;
    } catch (_) {
      return dateStr;
    }
  }

  function formatUpcomingDate(isoStr?: string): { badge: string; isTomorrow: boolean; dateText: string; timeText: string } {
    if (!isoStr) return { badge: "Upcoming", isTomorrow: false, dateText: "", timeText: "" };
    try {
      const [dPart, tPart] = isoStr.split("T");
      const [y, m, d] = dPart.split("-").map(Number);
      const targetDate = new Date(Date.UTC(y, m - 1, d));
      const today = new Date();
      const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const diffDays = Math.round((targetDate.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24));
      const timeText = tPart ? tPart.slice(0, 5) : "";
      const dateText = targetDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      if (diffDays === 1) {
        return { badge: "Tomorrow", isTomorrow: true, dateText, timeText };
      }
      return { badge: dateText, isTomorrow: false, dateText, timeText };
    } catch (_) {
      return { badge: "Upcoming", isTomorrow: false, dateText: isoStr, timeText: "" };
    }
  }

  // 3-Detent Sheet Physics & Layout Controller
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [sheetDetent, setSheetDetent] = useState<"mid" | "upper" | "peek">("mid");
  const sheetScrollerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  const suppressClickUntilRef = useRef<number>(0);

  // 60fps Native Sheet Touch Gesture Engine (Full Parity with site/public/js/admin.js)
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const sheet = sheetRef.current;
    const scroller = sheetScrollerRef.current;
    if (!sheet || !scroller) return;

    const PEEK_HEIGHT = 250;
    const TOP_ZONE = 136;
    const TOP_GAIN = 1.35;
    const CONTENT_GAIN = 1.0;
    const TAP_SLOP = 6;
    const FLICK_VELOCITY = 0.55;
    const SNAP_MS = 320;

    let gesture: {
      x: number;
      y: number;
      startDetent: "mid" | "upper" | "peek";
      gain: number;
      active: boolean;
      cancelled: boolean;
      moved: boolean;
      velocity: number;
      lastY: number;
      lastT: number;
      startScrollTop: number;
    } | null = null;

    // Ghost-click guard: dragging must never click a card or button
    const handleDocumentClick = (e: MouseEvent) => {
      if (Date.now() < suppressClickUntilRef.current) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener("click", handleDocumentClick, true);

    const onTouchStart = (e: TouchEvent) => {
      if (typeof window !== "undefined" && window.innerWidth >= 960) return;
      if (e.touches.length !== 1) return;
      const target = e.target as HTMLElement;
      if (target.closest("button, input, select, a, textarea, [role='button']:not(#sheet-handle-bar)")) return;

      const touch = e.touches[0];
      const rect = sheet.getBoundingClientRect();

      gesture = {
        x: touch.clientX,
        y: touch.clientY,
        startDetent: sheetDetent,
        gain: touch.clientY - rect.top < TOP_ZONE ? TOP_GAIN : CONTENT_GAIN,
        active: false,
        cancelled: false,
        moved: false,
        velocity: 0,
        lastY: touch.clientY,
        lastT: performance.now(),
        startScrollTop: scroller.scrollTop,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (typeof window !== "undefined" && window.innerWidth >= 960) return;
      if (!gesture || e.touches.length !== 1) return;
      if (gesture.cancelled) return;

      const touch = e.touches[0];
      const dx = touch.clientX - gesture.x;
      const dy = touch.clientY - gesture.y;

      if (!gesture.active) {
        // Wait until clear movement
        if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          gesture.cancelled = true;
          return;
        }

        // Sheet limit boundary guards
        if (gesture.startDetent === "peek" && dy > 0) {
          gesture.cancelled = true;
          return;
        }
        if (gesture.startDetent === "upper" && dy < 0) {
          gesture.cancelled = true;
          return;
        }

        // Allow feed to scroll first; hand over at scrollTop <= 0
        if (dy > 0 && scroller.scrollTop > 0) return;

        gesture.active = true;
        gesture.lastY = touch.clientY;
        gesture.lastT = performance.now();
        sheet.classList.add("is-dragging");
        document.body.classList.add("is-sheet-dragging");
      }

      // CRITICAL: Block native mobile browser pull-to-refresh
      if (e.cancelable) e.preventDefault();

      const baseOffset = gesture.startDetent === "upper" ? 80 : gesture.startDetent === "peek" ? (typeof window !== "undefined" ? window.innerHeight - 250 : 360) : 195;
      let next = baseOffset + dy * gesture.gain;
      if (next < 80) next = 80 + (next - 80) * 0.25;

      sheet.style.transform = `translate3d(0, ${next}px, 0)`;

      const now = performance.now();
      const dt = now - gesture.lastT;
      if (dt > 0) {
        gesture.velocity = (touch.clientY - gesture.lastY) / dt;
        gesture.lastY = touch.clientY;
        gesture.lastT = now;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!gesture) return;
      const state = gesture;
      gesture = null;
      if (!state.active) return;

      if (e.cancelable) e.preventDefault();
      sheet.classList.remove("is-dragging");
      document.body.classList.remove("is-sheet-dragging");

      const dy = state.lastY - state.y;
      const flick = Math.abs(state.velocity) > FLICK_VELOCITY;
      let targetDetent = state.startDetent;

      if (state.startDetent === "mid") {
        if (flick ? state.velocity > 0 : dy > 60) {
          targetDetent = "peek";
          setCalendarMode("month");
        } else if (flick ? state.velocity < 0 : dy < -60) {
          targetDetent = "upper";
        }
      } else if (state.startDetent === "upper") {
        if (flick ? state.velocity > 0 : dy > 60) {
          targetDetent = "mid";
        }
      } else if (state.startDetent === "peek") {
        if (flick ? state.velocity < 0 : dy < -60) {
          targetDetent = "mid";
          setCalendarMode("week");
        }
      }

      setSheetDetent(targetDetent);

      const targetOffset = targetDetent === "upper" ? 80 : targetDetent === "peek" ? (typeof window !== "undefined" ? window.innerHeight - 250 : 360) : 195;
      sheet.style.transition = `transform ${SNAP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      sheet.style.transform = `translate3d(0, ${targetOffset}px, 0)`;

      setTimeout(() => {
        sheet.style.transition = "";
        sheet.style.transform = "";
      }, SNAP_MS + 20);

      if (state.moved) suppressClickUntilRef.current = Date.now() + 420;
    };

    sheet.addEventListener("touchstart", onTouchStart, { passive: true });
    sheet.addEventListener("touchmove", onTouchMove, { passive: false });
    sheet.addEventListener("touchend", onTouchEnd);
    sheet.addEventListener("touchcancel", onTouchEnd);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      sheet.removeEventListener("touchstart", onTouchStart);
      sheet.removeEventListener("touchmove", onTouchMove);
      sheet.removeEventListener("touchend", onTouchEnd);
      sheet.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [authStatus, sheetDetent, activeTab]);

  const handleSheetHandleClick = () => {
    if (activeTab === "kalender") {
      if (sheetDetent === "peek") {
        setSheetDetent("mid");
        setCalendarMode("week");
      } else {
        setSheetDetent("peek");
        setCalendarMode("month");
      }
    } else if (activeTab === "avtaler") {
      setSheetDetent((prev) => (prev === "upper" ? "mid" : "upper"));
    } else {
      setSheetDetent((prev) => (prev === "upper" ? "mid" : "upper"));
    }
  };

  const switchTab = (tab: "kalender" | "avtaler" | "schedule" | "settings") => {
    setActiveTab(tab);
    if (tab === "schedule" || tab === "settings" || tab === "avtaler") {
      setSheetDetent("upper");
    } else if (tab === "kalender") {
      setSheetDetent(calendarMode === "month" ? "peek" : "mid");
    }
  };

  const handleApproveWithGuard = (ref: string, emailStatus?: string) => {
    const isFailed = ["bounced", "failed", "suppressed", "complained"].includes(emailStatus || "");
    if (isFailed) {
      setConfirmModal({
        isOpen: true,
        title: "Confirm Appointment?",
        message: "This client's confirmation email could not be delivered (bounced). Are you sure you want to approve this appointment without an email receipt?",
        confirmLabel: "Confirm Anyway",
        onConfirm: () => {
          handleBookingStatus(ref, "confirmed");
          setConfirmModal(null);
        },
      });
      return;
    }
    handleBookingStatus(ref, "confirmed");
  };

  // Fluid bottom dock slider indicator
  useEffect(() => {
    const updateSlider = () => {
      if (!dockRef.current || !indicatorRef.current) return;
      const activeBtn = dockRef.current.querySelector<HTMLButtonElement>(".dock-pill.active");
      if (!activeBtn) return;
      indicatorRef.current.style.transform = `translate3d(${activeBtn.offsetLeft}px, 0, 0)`;
      indicatorRef.current.style.width = `${activeBtn.offsetWidth}px`;
      indicatorRef.current.style.opacity = "1";
    };
    const raf = requestAnimationFrame(updateSlider);
    window.addEventListener("resize", updateSlider);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateSlider);
    };
  }, [activeTab, bookings, isMounted]);

  useEffect(() => {
    function checkViewport() {
      setIsMobileViewport(window.innerWidth < 960);
    }
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  }

  const enterDemoSandbox = () => {
    setActiveTenant("noire");
    setAuthStatus("authenticated");
    setTenantProfile({
      id: "noire",
      name: "Atelier Noire",
      tagline: "Studio Manager",
      monogram: "N",
      logo_url: "",
      owner_email: "demo@agure.space",
      contact_email: "contact@ateliernoire.no",
      phone: "+47 912 34 567",
      whatsapp: "+47 912 34 567",
      address: "Frognerveien 12, 0257 Oslo",
      org_number: "999 888 777 MVA",
    });
    setBookings(MOCK_DEMO_BOOKINGS);
    showToast("Welcome to Atelier Noire Demo Sandbox");
  };

  // Dynamic email lookup to resolve studio branding while locked.
  // Instant resolution via local cache/fast-path (0ms), micro-debounce (50ms) for new lookups.
  const handleEmailLookup = (email: string) => {
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    const cleaned = email.trim().toLowerCase();

    if (!cleaned || !cleaned.includes("@")) {
      setActiveTenant("");
      setTenantProfile(EMPTY_TENANT_PROFILE);
      return;
    }

    // 1. Synchronous Instant Fast-Path (0ms)
    const known = KNOWN_TENANT_LOOKUP[cleaned] || LOOKUP_MEMORY_CACHE.get(cleaned);
    if (known !== undefined) {
      if (known) {
        setActiveTenant(known.id);
        setTenantProfile({
          id: known.id,
          name: known.name,
          monogram: known.monogram,
          logo_url: known.logo_url,
          tagline: known.tagline,
        });
      } else {
        setActiveTenant("");
        setTenantProfile(EMPTY_TENANT_PROFILE);
      }
      return;
    }

    // 2. Fast network lookup (0ms for completed email, 50ms micro-debounce while typing domain)
    const isCompletedDomain = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(cleaned);
    const delayMs = isCompletedDomain ? 0 : 50;

    lookupTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/auth/lookup?email=${encodeURIComponent(cleaned)}`);
        const data = res.ok ? await res.json() : null;
        if (data?.success && data.tenant_id) {
          const profile = {
            id: data.tenant_id,
            name: data.name || "",
            monogram: data.monogram || (data.name || "").slice(0, 2).toUpperCase(),
            logo_url: data.logo_url || "",
            tagline: "Studio Manager",
          };
          LOOKUP_MEMORY_CACHE.set(cleaned, profile);
          setActiveTenant(profile.id);
          setTenantProfile(profile);
        } else {
          LOOKUP_MEMORY_CACHE.set(cleaned, null);
          setActiveTenant("");
          setTenantProfile(EMPTY_TENANT_PROFILE);
        }
      } catch (_) {
        setActiveTenant("");
        setTenantProfile(EMPTY_TENANT_PROFILE);
      }
    }, delayMs);
  };

  // NOTE: do not resolve branding from `?tenant=` while locked. The login wall
  // stays neutral until the visitor types an email that resolves to a studio;
  // the URL parameter is only used for post-login tenant switching.

  // Sync with tenant query param
  useEffect(() => {
    if (!tenantParam) return;
    // A tenant session is authoritative; only platform admins may switch by URL.
    if (
      session?.authenticated &&
      session.scope !== "platform" &&
      session.tenant_id &&
      tenantParam !== session.tenant_id
    ) {
      return;
    }
    if (tenantParam === "demo-studio") {
      enterDemoSandbox();
    } else {
      setActiveTenant(tenantParam);
    }
  }, [tenantParam, session]);

  // Check auth session
  useEffect(() => {
    setIsMounted(true);
    async function checkAuth() {
      if (searchParams.get("demo") === "1" || searchParams.get("demo") === "true" || tenantParam === "demo-studio") {
        enterDemoSandbox();
        setAuthStatus("authenticated");
        return;
      }
      try {
        const res = await fetch("/api/admin/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setSession(data);
            setAuthStatus("authenticated");
            // The session's tenant is authoritative. Never fall back to noire.
            if (data.tenant_id) {
              setActiveTenant(data.tenant_id);
            }
          } else {
            setSession(null);
            setAuthStatus("unauthenticated");
            setActiveTenant("");
            setTenantProfile(EMPTY_TENANT_PROFILE);
          }
        } else {
          setSession(null);
          setAuthStatus("unauthenticated");
        }
      } catch (err) {
        setSession(null);
        setAuthStatus("unauthenticated");
      }
    }
    checkAuth();
  }, []);

  // Hydrate accessible tenants
  useEffect(() => {
    async function loadTenants() {
      try {
        const res = await fetch("/api/admin/tenants");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tenants)) {
            setTenantList(data.tenants);
            if (data.tenants.length > 0) {
              setActiveTenant((current) => current || data.tenants[0].id);
            }
          }
        }
      } catch (_) {}
    }
    if (!isLocked) loadTenants();
  }, [isLocked]);

  // Load tenant profile & data
  useEffect(() => {
    // Abort in-flight loads when the tenant changes or the studio is locked:
    // a late settings response must never repaint the login wall with branding.
    const controller = new AbortController();
    const { signal } = controller;

    async function loadTenantData() {
      if (isLocked) return;
      if (!activeTenant) return;
      const isDemo = searchParams.get("demo") === "1" || searchParams.get("demo") === "true";
      if (activeTenant === "demo-studio") {
        enterDemoSandbox();
        return;
      }
      try {
        const [profRes, bookRes, hoursRes, blackRes, auditRes, servRes] = await Promise.all([
          fetch(`/api/admin/settings?tenant_id=${encodeURIComponent(activeTenant)}`, { signal }),
          fetch(`/api/admin/bookings?tenant_id=${encodeURIComponent(activeTenant)}`, { signal }),
          fetch(`/api/admin/hours?tenant_id=${encodeURIComponent(activeTenant)}`, { signal }),
          fetch(`/api/admin/blackouts?tenant_id=${encodeURIComponent(activeTenant)}`, { signal }),
          fetch(`/api/admin/audit?tenant_id=${encodeURIComponent(activeTenant)}`, { signal }),
          fetch(`/api/v1/t/${encodeURIComponent(activeTenant)}/services`, { signal }).catch(() => null),
        ]);

        if (signal.aborted) return;

        if (profRes.ok) {
          const pData = await profRes.json();
          if (pData.tenant) {
            setTenantProfile({
              id: activeTenant,
              name: pData.tenant.name || activeTenant,
              tagline: pData.tenant.branding?.tagline || "Studio Manager",
              monogram: pData.tenant.branding?.monogram || activeTenant.slice(0, 2).toUpperCase(),
              logo_url: pData.tenant.branding?.assets?.logo_url || pData.tenant.logo_url || "",
              owner_email: pData.tenant.owner_email || "",
              contact_email: pData.tenant.contact_email || "",
              phone: pData.tenant.phone || "",
              whatsapp: pData.tenant.whatsapp || "",
              address: pData.tenant.address || "",
              org_number: pData.tenant.org_number || "",
            });
            if (pData.tenant.branding?.preset) {
              setActiveTheme(pData.tenant.branding.preset);
            }
          }
        }

        if (bookRes.ok) {
          const bData = await bookRes.json();
          if (Array.isArray(bData.bookings) && bData.bookings.length > 0) {
            setBookings(bData.bookings.map(normalizeBooking));
          } else if (isDemo) {
            setBookings(MOCK_DEMO_BOOKINGS);
          }
        } else if (isDemo) {
          setBookings(MOCK_DEMO_BOOKINGS);
        }

        if (hoursRes.ok) {
          const hData = await hoursRes.json();
          if (hData.shifts) setShifts(hData.shifts);
          if (hData.interval_min) setSlotInterval(String(hData.interval_min));
          if (hData.date_overrides) setDateOverrides(hData.date_overrides);
        }

        if (blackRes.ok) {
          const blData = await blackRes.json();
          if (Array.isArray(blData.blackouts)) setBlackouts(blData.blackouts);
        }

        if (auditRes.ok) {
          const aData = await auditRes.json();
          if (Array.isArray(aData.events)) setActivityLogs(aData.events);
        }

        if (servRes && servRes.ok) {
          const sData = await servRes.json();
          if (Array.isArray(sData.services) && sData.services.length > 0) {
            setServicesList(sData.services);
            setNewService(sData.services[0].name);
            setNewPrice(sData.services[0].price_nok);
            setNewDuration(sData.services[0].duration_min);
          }
        }
      } catch (err) {
        if (!signal.aborted) console.error("Failed to load tenant data:", err);
      } finally {
        if (!signal.aborted) setIsInitialDataLoading(false);
      }
    }
    loadTenantData();
    return () => controller.abort();
  }, [activeTenant, isLocked]);

  // UX-02: Escape key listener for all drawers and modals
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveDrawerBooking(null);
        setShowNewBookingModal(false);
        setShowBlockTimeModal(false);
        setShowRescheduleModal(false);
        setShowCustomThemeSheet(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChallengeId(data.challengeId);
        setLoginStep("code");
        // The server resolved the tenant from the email.
        if (data.tenant_id) setActiveTenant(data.tenant_id);
        showToast("✓ Verification code sent to your inbox");
      } else {
        setLoginError(data.error || data.message || "Unauthorized email for this studio.");
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
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const verifiedTenant =
          typeof data.tenant_id === "string" ? data.tenant_id : "";
        setAuthStatus("authenticated");
        setSession({
          authenticated: true,
          email: data.email || loginEmail,
          tenant_id: verifiedTenant,
          scope: data.scope,
        });
        if (verifiedTenant) setActiveTenant(verifiedTenant);
        showToast("✓ Studio Manager unlocked");
      } else {
        setLoginError(data.error || data.message || "Invalid or expired code.");
      }
    } catch (_) {
      setLoginError("Verification failed. Please try again.");
    } finally {
      setIsSubmittingLogin(false);
    }
  }

  async function handleLock() {
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    setAuthStatus("unauthenticated");
    setSession(null);
    setLoginStep("email");
    setLoginEmail("");
    setLoginPin("");
    setChallengeId("");
    setLoginError("");
    setActiveTenant("");
    setTenantProfile(EMPTY_TENANT_PROFILE);
    setTenantList([]);
    setBookings([]);
    setActivityLogs([]);
    setBlackouts([]);
    setActiveDrawerBooking(null);
    setShowNewBookingModal(false);
    setShowBlockTimeModal(false);
    setShowRescheduleModal(false);
    setShowCustomThemeSheet(false);
    setNewClientName("");
    setNewClientPhone("");
    setNewClientEmail("");
    setNewService("Signature Session");
    setSlotInterval("30");
    setShifts(makeDefaultShifts());
    setSearchFilter("");
    // Revoke server-side first: a reload fired while this is still in flight
    // would restore the session from the old cookie.
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch (_) {}
    // Drop ?tenant=... and ?demo=... so the next visit starts neutral.
    router.replace("/admin");
    showToast("Studio Manager locked");
  }

  // Triage actions
  async function handleBookingStatus(ref: string, newStatus: "confirmed" | "declined" | "cancelled") {
    setTriageActionRef(`${ref}-${newStatus}`);
    try {
      const res = await fetch("/api/admin/bookings/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, status: newStatus, tenant_id: activeTenant }),
      });
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.ref === ref ? { ...b, status: newStatus } : b))
        );
        if (activeDrawerBooking && activeDrawerBooking.ref === ref) {
          setActiveDrawerBooking({ ...activeDrawerBooking, status: newStatus });
        }
        showToast(`✓ Booking ${newStatus}`);
      } else {
        showToast("Error updating booking status");
      }
    } catch (_) {
      showToast("Network error updating status");
    } finally {
      setTriageActionRef(null);
    }
  }

  // Manual booking submit
  async function handleCreateManualBooking(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingBooking(true);
    try {
      const res = await fetch("/api/admin/bookings/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: activeTenant,
          client_name: newClientName,
          client_phone: newClientPhone,
          client_email: newClientEmail,
          service_name: newService,
          date: newDate,
          time: newTime,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast("✓ Appointment created successfully");
        setShowNewBookingModal(false);
        // Refresh bookings
        const bRes = await fetch(`/api/admin/bookings?tenant_id=${encodeURIComponent(activeTenant)}`);
        if (bRes.ok) {
          const bData = await bRes.json();
          if (Array.isArray(bData.bookings)) setBookings(bData.bookings.map(normalizeBooking));
        }
      } else {
        showToast("Could not create booking");
      }
    } catch (_) {
      showToast("Network error creating booking");
    } finally {
      setIsSubmittingBooking(false);
    }
  }

  // Save settings with owner-transfer reauthentication handling
  async function handleSaveSettings() {
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: activeTenant,
          name: tenantProfile.name,
          owner_email: tenantProfile.owner_email,
          contact_email: tenantProfile.contact_email,
          phone: tenantProfile.phone,
          whatsapp: tenantProfile.whatsapp,
          address: tenantProfile.address,
          org_number: tenantProfile.org_number,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success || data.tenant)) {
        if (data.reauthentication_required) {
          showToast("Ownership transferred. Sign in as the new owner.");
          handleLock();
          return;
        }
        if (data.owner_changed) {
          showToast(`✓ Ownership transferred to ${tenantProfile.owner_email}`);
        } else {
          showToast("✓ Studio settings saved successfully");
        }
      } else {
        showToast(data.error ? `Could not save settings: ${data.error}` : "Could not save settings");
      }
    } catch (_) {
      showToast("Network error saving settings");
    } finally {
      setIsSavingSettings(false);
    }
  }

  // Reschedule booking
  async function handleRescheduleBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDrawerBooking) return;
    setIsSubmittingReschedule(true);
    try {
      const res = await fetch("/api/admin/bookings/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: activeDrawerBooking.ref,
          date: rescheduleDate || selectedDate,
          time: rescheduleTime || "12:00",
          tenant_id: activeTenant,
        }),
      });
      if (res.ok) {
        showToast("✓ Appointment rescheduled successfully");
        setShowRescheduleModal(false);
        setActiveDrawerBooking(null);
        const bRes = await fetch(`/api/admin/bookings?tenant_id=${encodeURIComponent(activeTenant)}`);
        if (bRes.ok) {
          const bData = await bRes.json();
          if (Array.isArray(bData.bookings)) setBookings(bData.bookings.map(normalizeBooking));
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || "Could not reschedule appointment");
      }
    } catch (_) {
      showToast("Network error rescheduling appointment");
    } finally {
      setIsSubmittingReschedule(false);
    }
  }

  // Apply theme preset
  function handleSelectPreset(presetId: string) {
    setActiveTheme(presetId);
    showToast(`✓ Applied ${presetId.replace("-", " ")} theme`);
  }

  // Calculations
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const filteredBookings = bookings.filter((b) => {
    if (segmentFilter === "pending") return b.status === "pending";
    if (segmentFilter === "confirmed") return b.status === "confirmed";
    if (segmentFilter === "archive") return b.status === "declined" || b.status === "cancelled";
    if (segmentFilter === "active") return b.status === "pending" || b.status === "confirmed";
    return true;
  }).filter((b) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      b.client_name.toLowerCase().includes(q) ||
      (b.client_email && b.client_email.toLowerCase().includes(q)) ||
      (b.client_phone && b.client_phone.includes(q)) ||
      b.ref.toLowerCase().includes(q)
    );
  });

  const monogram = tenantProfile.monogram || activeTenant.slice(0, 2).toUpperCase();

  if (authStatus === "checking") {
    return (
      <div id="admin-page-root" className="admin-skeleton-screen" data-theme={activeTheme}>
        {/* Top Canopy Skeleton */}
        <div className="skeleton-topbar">
          <div style={{ display: "flex", alignItems: "center" }}>
            <div className="skeleton-avatar skeleton-shimmer" />
            <div className="skeleton-title-box">
              <div className="skeleton-line-title skeleton-shimmer" />
              <div className="skeleton-line-sub skeleton-shimmer" />
            </div>
          </div>
          <div className="skeleton-action-btn skeleton-shimmer" />
        </div>

        {/* Calendar Strip Skeleton */}
        <div className="skeleton-calendar-strip">
          <div className="skeleton-cal-head">
            <div style={{ width: 120, height: 16, borderRadius: 4 }} className="skeleton-shimmer" />
            <div style={{ width: 64, height: 26, borderRadius: 999 }} className="skeleton-shimmer" />
          </div>
          <div className="skeleton-cal-days">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-cal-pill skeleton-shimmer" />
            ))}
          </div>
        </div>

        {/* Sheet Skeleton */}
        <div className="skeleton-sheet-container">
          <div className="skeleton-sheet-handle" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ width: 140, height: 18, borderRadius: 4 }} className="skeleton-shimmer-light" />
            <div style={{ width: 80, height: 22, borderRadius: 999 }} className="skeleton-shimmer-light" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "999px" }} className="skeleton-shimmer-light" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ width: 90, height: 12, borderRadius: 3 }} className="skeleton-shimmer-light" />
                    <div style={{ width: 120, height: 10, borderRadius: 3 }} className="skeleton-shimmer-light" />
                  </div>
                </div>
                <div style={{ width: 55, height: 18, borderRadius: 999 }} className="skeleton-shimmer-light" />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <div style={{ width: 80, height: 12, borderRadius: 3 }} className="skeleton-shimmer-light" />
                <div style={{ width: 50, height: 12, borderRadius: 3 }} className="skeleton-shimmer-light" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <div
        id="admin-page-root"
        data-theme={activeTheme}
        style={{
          position: "relative",
          width: "100%",
          height: "100dvh",
          overflow: "hidden",
          backgroundColor: "var(--admin-canopy-bg, #121214)",
        }}
      >
        <div
          id="admin-login-overlay"
          className="login-gate-overlay"
          style={{ display: "flex", zIndex: 2000 }}
        >
          <div className="login-arch-watermark" aria-hidden="true">
            PORTAL
          </div>

          <div
            id="admin-login-card"
            className="login-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-studio-name"
          >
            {(() => {
              const isResolved = Boolean(tenantProfile.logo_url || tenantProfile.name);
              return (
                <div
                  className={`login-brand-badge ${isResolved ? "is-resolved" : ""}`}
                  id={isResolved ? "admin-login-badge" : undefined}
                  aria-hidden="true"
                >
                  <span className="login-brand-badge-mark">
                    <span>{isResolved && tenantProfile.monogram ? tenantProfile.monogram : "A.G"}</span>
                  </span>
                  <span className="login-brand-badge-logo">
                    <img id="admin-login-logo" src={tenantProfile.logo_url || ""} alt={tenantProfile.name || ""} />
                  </span>
                </div>
              );
            })()}

            <h2 id="login-studio-name" className="login-card-title">
              {tenantProfile.name || "Admin Portal"}
            </h2>
            <p id="login-subtitle" className="login-card-subtitle">
              {loginStep === "email" ? "Enter email to open portal" : "Enter verification code"}
            </p>

            {/* STEP 1: Email */}
            {loginStep === "email" ? (
              <div className="login-step" id="login-step-email">
                <form id="admin-email-form" onSubmit={handleSendOtp} noValidate>
                  <input
                    type="email"
                    id="admin-login-email"
                    className="login-gate-input"
                    placeholder="Email address"
                    value={loginEmail}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLoginEmail(val);
                      setLoginError("");
                      handleEmailLookup(val);
                    }}
                    autoComplete="email"
                    required
                  />
                  {loginError && (
                    <div id="admin-email-error" className="login-gate-error" style={{ display: "block" }}>
                      {loginError}
                    </div>
                  )}
                  <button
                    type="submit"
                    id="admin-send-otp-btn"
                    className="login-gate-submit"
                    disabled={isSubmittingLogin}
                  >
                    {isSubmittingLogin ? "Sending code..." : "Send verification code →"}
                  </button>
                </form>
              </div>
            ) : (
              /* STEP 2: 6-Digit PIN */
              <div className="login-step" id="login-step-code">
                <div className="login-code-chip" id="login-code-chip">
                  <span className="login-code-chip-text">
                    Code sent to <strong id="login-code-chip-email">{loginEmail}</strong>
                  </span>
                  <button
                    type="button"
                    id="login-change-email-btn"
                    className="login-code-chip-change"
                    onClick={() => setLoginStep("email")}
                  >
                    Change
                  </button>
                </div>
                <form id="admin-login-form" onSubmit={handleVerifyOtp} noValidate>
                  <input
                    type="password"
                    id="admin-pin-input"
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
                    <div id="admin-login-error" className="login-gate-error" style={{ display: "block" }}>
                      {loginError}
                    </div>
                  )}
                  <button
                    type="submit"
                    id="admin-verify-btn"
                    className="login-gate-submit"
                    disabled={isSubmittingLogin}
                  >
                    {isSubmittingLogin ? "Verifying..." : "Open Studio Manager →"}
                  </button>
                </form>
                <button
                  type="button"
                  id="login-resend-btn"
                  className="login-gate-otp"
                  onClick={handleSendOtp}
                  disabled={isSubmittingLogin}
                >
                  Resend code
                </button>
              </div>
            )}

            {/* Dedicated Demo Sandbox Access */}
            <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "center" }}>
              <button
                type="button"
                id="admin-demo-sandbox-btn"
                onClick={enterDemoSandbox}
                style={{
                  background: "rgba(196, 164, 130, 0.08)",
                  color: "#C4A482",
                  border: "1px dashed rgba(196, 164, 130, 0.4)",
                  borderRadius: "9999px",
                  padding: "10px 18px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.15s ease",
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                <span>Try Demo Sandbox (No Login Required)</span>
              </button>
            </div>
          </div>
        </div>

        {confirmModal?.isOpen && (
          <div className="modal-backdrop open" style={{ zIndex: 3000 }}>
            <motion.div
              className="confirm-modal-card"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
            >
              <h3 className="confirm-modal-title">{confirmModal.title}</h3>
              <p className="confirm-modal-message">{confirmModal.message}</p>
              <div className="confirm-modal-actions">
                <button
                  type="button"
                  className="confirm-btn-cancel"
                  onClick={() => setConfirmModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="confirm-btn-confirm"
                  onClick={() => {
                    const cb = confirmModal.onConfirm;
                    setConfirmModal(null);
                    cb();
                  }}
                >
                  {confirmModal.confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {toastMessage && (
          <div className="admin-toast" id="admin-toast" role="status">
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      id="admin-page-root"
      data-theme={activeTheme}
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        backgroundColor: "var(--admin-canopy-bg, #121214)",
      }}
    >
      {/* =================================================================== */}
      {/* 2. DUAL-SURFACE APP SHELL: Obsidian Canopy + Draggable Porcelain    */}
      {/* =================================================================== */}
      <div className={`admin-shell ${sheetDetent === "peek" ? "canopy-expanded" : ""} ${sheetDetent === "upper" ? "sheet-upper" : ""}`}>
        {/* UPPER / LEFT OBSIDIAN CANOPY (#121214) */}
        <header className="obsidian-canopy" id="obsidian-canopy">
          {/* Topbar Brand Cluster */}
          <div className="canopy-topbar">
            <div className="canopy-brand-cluster">
              <div className="admin-header-logo-container">
                {tenantProfile.logo_url ? (
                  <img
                    src={tenantProfile.logo_url}
                    alt={tenantProfile.name}
                    className="canopy-logo-img"
                    id="canopy-header-logo"
                  />
                ) : (
                  <span
                    id="canopy-logo-monogram"
                    style={{
                      fontFamily: "var(--font-display, 'Cinzel', serif)",
                      fontWeight: 700,
                      color: "#121214",
                    }}
                  >
                    {monogram}
                  </span>
                )}
              </div>

              <div>
                <h1 className="admin-header-title" id="canopy-studio-title">
                  {getCleanStudioName(activeTenant, tenantProfile.name)}
                </h1>
                <p className="admin-header-subtitle" id="canopy-studio-tagline">
                  {tenantProfile.tagline || "Studio Manager"}
                </p>
              </div>
            </div>

            {/* Header Action Cluster */}
            <div className="canopy-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {!isLocked && session?.authenticated && tenantList.length > 1 && (
                <select
                  id="header-tenant-switcher"
                  className="recessed-input"
                  style={{
                    padding: "6px 10px",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    color: "#FFFFFF",
                    borderColor: "rgba(255, 255, 255, 0.14)",
                  }}
                  value={activeTenant}
                  onChange={(e) => {
                    const nextTenant = e.target.value;
                    setActiveTenant(nextTenant);
                    router.push(`/admin?tenant=${encodeURIComponent(nextTenant)}`);
                  }}
                >
                  {tenantList.map((t) => (
                    <option key={t.id} value={t.id} style={{ color: "#111", background: "#fff" }}>
                      {getCleanStudioName(t.id, t.name)}
                    </option>
                  ))}
                </select>
              )}

              {activeTenant === "demo-studio" && (
                <button
                  type="button"
                  className="demo-reset-pill"
                  id="admin-demo-reset-btn"
                  onClick={() => {
                    setBookings([...MOCK_DEMO_BOOKINGS]);
                    showToast("✓ Demo Sandbox reset to original appointments");
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(255, 255, 255, 0.12)",
                    border: "1px solid rgba(255, 255, 255, 0.22)",
                    color: "#FFFFFF",
                    borderRadius: "999px",
                    padding: "4px 10px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ color: "#34D399", fontSize: "0.6rem" }}>●</span> Demo Sandbox · Reset Data
                </button>
              )}

              <button
                type="button"
                className="canopy-new-btn"
                id="canopy-quick-new-booking"
                onClick={() => setShowNewBookingModal(true)}
              >
                + New Booking
              </button>

              <button
                type="button"
                className="canopy-lock-btn"
                id="admin-lock-btn"
                title="Lock Studio Manager"
                onClick={handleLock}
              >
                🔒
              </button>
            </div>
          </div>

          <div className="canopy-watermark" aria-hidden="true">
            <img src={tenantProfile.logo_url || "/img/logo-v2.png"} alt="" className="canopy-watermark-img" />
          </div>

          {/* Calendar Header & View Switcher */}
          <div className="canopy-calendar-header">
            <div className="cal-month-title-wrap">
              <h2 className="cal-month-title" id="cal-month-label">
                {new Date(Date.UTC(viewYear, viewMonth, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
              </h2>
              <div className="cal-nav-arrows">
                <button
                  type="button"
                  className="cal-arrow-btn"
                  id="cal-prev-month"
                  aria-label="Previous Month"
                  onClick={() => {
                    if (viewMonth === 0) {
                      setViewYear((prev) => prev - 1);
                      setViewMonth(11);
                      setSelectedDate(`${viewYear - 1}-12-01`);
                    } else {
                      const prevM = viewMonth - 1;
                      setViewMonth(prevM);
                      setSelectedDate(`${viewYear}-${String(prevM + 1).padStart(2, "0")}-01`);
                    }
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="cal-arrow-btn"
                  id="cal-next-month"
                  aria-label="Next Month"
                  onClick={() => {
                    if (viewMonth === 11) {
                      setViewYear((prev) => prev + 1);
                      setViewMonth(0);
                      setSelectedDate(`${viewYear + 1}-01-01`);
                    } else {
                      const nextM = viewMonth + 1;
                      setViewMonth(nextM);
                      setSelectedDate(`${viewYear}-${String(nextM + 1).padStart(2, "0")}-01`);
                    }
                  }}
                >
                  ›
                </button>
              </div>
            </div>

            {(() => {
              const now = new Date();
              const todayIso = now.toISOString().split("T")[0];
              const isToday = selectedDate === todayIso;

              return (
                <button
                  type="button"
                  className={`cal-today-btn ${!isToday ? "is-jump" : ""}`}
                  id="cal-today-btn"
                  onClick={() => {
                    const todayDate = new Date();
                    const nowIso = todayDate.toISOString().split("T")[0];
                    setSelectedDate(nowIso);
                    setViewYear(todayDate.getUTCFullYear());
                    setViewMonth(todayDate.getUTCMonth());
                    setCalendarMode("week");
                    setSheetDetent("mid");
                  }}
                  title="Jump to Today"
                >
                  <span className="cal-today-dot" aria-hidden="true" />
                  <span>
                    {isToday
                      ? "Today"
                      : `Today · ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </span>
                </button>
              );
            })()}
          </div>

          {/* 7-Day Week Strip */}
          <div className="canopy-week-strip" id="canopy-week-strip">
            {getWeekDaysForDate(selectedDate).map((day) => {
              const isSelected = day.iso === selectedDate;
              const isToday = day.iso === new Date().toISOString().split("T")[0];
              const hasBookings = bookings.some((b) => b.scheduled_at?.startsWith(day.iso));

              return (
                <button
                  key={day.iso}
                  type="button"
                  className={`week-day-pill ${isSelected ? "active" : ""} ${isToday ? "is-today" : ""}`}
                  onClick={() => {
                    setSelectedDate(day.iso);
                    setViewYear(day.year);
                    setViewMonth(day.month);
                  }}
                >
                  <span className="week-day-name">{day.name}</span>
                  <span className="week-day-num">{day.num}</span>
                  {hasBookings && <span className="day-dot-indicator" />}
                </button>
              );
            })}
          </div>

          {/* Accurate Offset-Aligned Month Grid (Both views remain in DOM for 60fps CSS transitions) */}
          <div className="canopy-month-grid" id="canopy-month-grid">
            <div className="month-grid-weekdays">
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
              <span>S</span>
            </div>
            <div className="month-grid-days" id="month-grid-days">
              {getMonthGridDays(viewYear, viewMonth).map((cell, idx) => {
                const isSelected = cell.iso === selectedDate;
                const isToday = cell.iso === new Date().toISOString().split("T")[0];
                const hasBookings = bookings.some((b) => b.scheduled_at?.startsWith(cell.iso));

                return (
                  <button
                    key={`${cell.iso}-${idx}`}
                    type="button"
                    className={`month-grid-cell month-day-cell ${isSelected ? "active" : ""} ${isToday ? "is-today" : ""}`}
                    style={{ opacity: cell.isCurrentMonth ? 1 : 0.35 }}
                    onClick={() => {
                      setSelectedDate(cell.iso);
                      setViewYear(cell.year);
                      setViewMonth(cell.month);
                      setCalendarMode("week");
                      setSheetDetent("mid");
                    }}
                  >
                    <span>{cell.dayNum}</span>
                    {hasBookings && <span className="cell-dot" />}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* LOWER DRAGGABLE PORCELAIN SHEET (#FAFAFA) */}
        <main
          ref={sheetRef}
          className="porcelain-sheet"
          id="porcelain-sheet"
        >
          {/* Top Centered Drag Handle Pill (Dedicated Gesture Zone) */}
          <div
            className="sheet-handle-bar"
            id="sheet-handle-bar"
            role="button"
            tabIndex={0}
            aria-label="Toggle calendar sheet position"
            aria-expanded={sheetDetent === "peek"}
            onClick={handleSheetHandleClick}
            style={{ touchAction: "none" }}
          >
            <div className="sheet-handle-pill" />
          </div>

          <div className="sheet-watermark" aria-hidden="true">
            <img src={tenantProfile.logo_url || "/img/logo-v2.png"} alt="" className="sheet-watermark-img" />
          </div>

          {/* Scrollable Sheet Content */}
          <div className="sheet-content-scroller" id="sheet-content-scroller" ref={sheetScrollerRef}>
            {/* ============================================================= */}
            {/* TAB 1: CALENDAR (Daily Agenda & Timeline)                     */}
            {/* ============================================================= */}
            {activeTab === "kalender" && (
              <section className="tab-panel active" id="panel-kalender">
                {/* Compact Sticky Header: Clean Date + Sessions pill & Slim Review Banner */}
                <div className="calendar-sticky-header" id="calendar-sticky-header">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: pendingBookings.length > 0 ? "8px" : "4px" }}>
                    <h3 style={{ fontSize: "1.02rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#111827", margin: 0 }} id="agenda-date-headline">
                      {formatEnglishDate(selectedDate)}
                    </h3>
                    <span className="status-pill-badge confirmed" id="agenda-count-badge" style={{ fontSize: "0.68rem", padding: "3px 8px" }}>
                      {bookings.filter((b) => b.scheduled_at?.startsWith(selectedDate)).length} sessions
                    </span>
                  </div>

                  {/* Slim Review Alert Banner */}
                  {pendingBookings.length > 0 && (
                    <div
                      className="pulse-review-pill is-compact"
                      id="pulse-review-pill"
                      onClick={() => {
                        setActiveTab("avtaler");
                        setSegmentFilter("pending");
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.85rem" }}>🔔</span>
                        <span className="pulse-title" id="pulse-review-count" style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                          {pendingBookings.length} {pendingBookings.length === 1 ? "review" : "reviews"} waiting
                        </span>
                      </div>
                      <button
                        type="button"
                        className="pulse-action-btn"
                        id="pulse-action-btn"
                        style={{ padding: "4px 10px", fontSize: "0.72rem" }}
                      >
                        Review →
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Action Bar */}
                <div className="calendar-quick-bar">
                  <button
                    type="button"
                    className="quick-action-btn"
                    id="btn-quick-block-time"
                    onClick={() => setShowBlockTimeModal(true)}
                  >
                    Block Time
                  </button>
                  <button
                    type="button"
                    className="quick-action-btn"
                    id="btn-refresh-agenda"
                    onClick={() => showToast("↻ Calendar synchronized")}
                  >
                    <span>↻</span> Sync Calendar
                  </button>
                </div>

                {/* Chronological Timeline Stack */}
                <div className="dagsagenda-timeline" id="dagsagenda-timeline">
                  {isInitialDataLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="skeleton-card" style={{ background: "#FAFAFA" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                              <div style={{ width: 32, height: 32, borderRadius: "999px" }} className="skeleton-shimmer-light" />
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <div style={{ width: 100, height: 12, borderRadius: "3px" }} className="skeleton-shimmer-light" />
                                <div style={{ width: 140, height: 10, borderRadius: "3px" }} className="skeleton-shimmer-light" />
                              </div>
                            </div>
                            <div style={{ width: 60, height: 20, borderRadius: "999px" }} className="skeleton-shimmer-light" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : bookings.filter((b) => b.scheduled_at?.startsWith(selectedDate)).length === 0 ? (
                    (() => {
                      const todayIso = new Date().toISOString().split("T")[0];
                      const isToday = selectedDate === todayIso;

                      if (isToday) {
                        const upcomingBookings = bookings
                          .filter((b) => (b.status === "confirmed" || b.status === "pending") && (b.scheduled_at && b.scheduled_at > `${todayIso}T23:59:59`))
                          .sort((a, b) => (a.scheduled_at || "").localeCompare(b.scheduled_at || ""))
                          .slice(0, 6);

                        return (
                          <div className="today-empty-flow">
                            {/* 1. Clear status banner for Today */}
                            <div className="today-empty-banner" id="today-empty-banner">
                              <div>
                                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827", marginBottom: "2px" }}>
                                  ✓ No sessions scheduled today
                                </div>
                                <div className="today-empty-text">
                                  Your schedule is completely clear for {formatEnglishDate(todayIso)}.
                                </div>
                              </div>
                              <button
                                type="button"
                                className="today-book-shortcut"
                                onClick={() => {
                                  setNewDate(todayIso);
                                  setShowNewBookingModal(true);
                                }}
                              >
                                + Book Today
                              </button>
                            </div>

                            {/* 2. Upcoming Schedule Section */}
                            <div className="upcoming-section-header">
                              <div>
                                <span className="upcoming-section-title">Upcoming Schedule · Next Sessions</span>
                                <div style={{ fontSize: "0.72rem", color: "var(--admin-sheet-muted)", marginTop: "1px" }}>
                                  Chronological overview of future studio appointments
                                </div>
                              </div>
                              {upcomingBookings.length > 0 && (
                                <span className="upcoming-date-chip">
                                  {upcomingBookings.length} upcoming
                                </span>
                              )}
                            </div>

                            {upcomingBookings.length === 0 ? (
                              <div className="timeline-empty-card" style={{ marginTop: "12px" }}>
                                <p>No future bookings recorded yet.</p>
                              </div>
                            ) : (
                              upcomingBookings.map((b) => {
                                const isPending = b.status === "pending";
                                const { badge, isTomorrow, dateText, timeText } = formatUpcomingDate(b.scheduled_at);

                                return (
                                  <div
                                    key={b.ref}
                                    className={`timeline-slot-row ${isPending ? "is-pending" : "is-confirmed"}`}
                                    onClick={() => setActiveDrawerBooking(b)}
                                    role="button"
                                    tabIndex={0}
                                    style={{
                                      display: "flex",
                                      alignItems: "stretch",
                                      gap: "12px",
                                      marginBottom: "10px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <div className="timeline-time-col">
                                      <strong>{timeText || "12:00"}</strong>
                                      <span>{b.duration_min || 45}m</span>
                                    </div>
                                    <div
                                      className="timeline-card-content"
                                      style={{
                                        flex: 1,
                                        borderRadius: "18px",
                                        padding: "14px 16px",
                                        background: isPending ? "var(--admin-pulse-bg, #FBEBC8)" : "#FFFFFF",
                                        border: isPending ? "1px solid rgba(217, 119, 6, 0.28)" : "1px solid rgba(0, 0, 0, 0.06)",
                                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "6px",
                                      }}
                                    >
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                          <span className="upcoming-date-chip" style={{ background: isTomorrow ? "rgba(22, 163, 74, 0.12)" : "rgba(196, 164, 130, 0.2)", color: isTomorrow ? "#15803D" : "#78350F", borderColor: isTomorrow ? "rgba(22, 163, 74, 0.3)" : "rgba(196, 164, 130, 0.4)" }}>
                                            {badge}
                                          </span>
                                          <button
                                            type="button"
                                            className="upcoming-jump-link"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const dPart = b.scheduled_at?.split("T")[0];
                                              if (dPart) {
                                                setSelectedDate(dPart);
                                                const [y, m] = dPart.split("-").map(Number);
                                                setViewYear(y);
                                                setViewMonth(m - 1);
                                              }
                                            }}
                                            title={`Go to ${dateText}`}
                                          >
                                            View day →
                                          </button>
                                        </div>
                                        <span
                                          className={`status-pill-badge ${b.status}`}
                                          style={{
                                            fontSize: "0.62rem",
                                            padding: "2px 7px",
                                            borderRadius: "999px",
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                          }}
                                        >
                                          {b.status}
                                        </span>
                                      </div>

                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                          <span
                                            style={{
                                              width: "32px",
                                              height: "32px",
                                              borderRadius: "50%",
                                              background: isPending ? "#D97706" : "var(--admin-accent, #111)",
                                              color: "#FFFFFF",
                                              fontSize: "0.72rem",
                                              fontWeight: 700,
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              flexShrink: 0,
                                            }}
                                          >
                                            {(b.client_name ?? "G").charAt(0).toUpperCase()}
                                          </span>
                                          <div>
                                            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>
                                              {b.client_name}
                                            </div>
                                            <div style={{ fontSize: "0.76rem", color: "var(--admin-sheet-muted, #6B7280)" }}>
                                              {b.service_name}
                                            </div>
                                          </div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#111827" }}>
                                            {b.service_price ? `${b.service_price} kr` : "850 kr"}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="timeline-empty-card">
                          <p>No appointments scheduled for this date.</p>
                        </div>
                      );
                    })()
                  ) : (
                    <>
                      {/* Morning Sessions (< 12:00) */}
                      {(() => {
                        const dayBookings = bookings.filter((b) => b.scheduled_at?.startsWith(selectedDate));
                        const morningBookings = dayBookings.filter((b) => (parseInt(b.scheduled_at?.split("T")[1]?.slice(0, 2) || "12", 10) < 12));
                        const afternoonBookings = dayBookings.filter((b) => (parseInt(b.scheduled_at?.split("T")[1]?.slice(0, 2) || "12", 10) >= 12));

                        return (
                          <>
                            <div className="agenda-block" style={{ marginBottom: "20px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", fontSize: "0.78rem", fontWeight: 700, color: "var(--admin-sheet-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                <span>☀️</span> Morning Appointments ({morningBookings.length})
                              </div>
                              {morningBookings.length === 0 ? (
                                <div style={{ padding: "12px 14px", borderRadius: "14px", background: "rgba(0,0,0,0.02)", color: "#888", fontSize: "0.78rem" }}>
                                  No morning appointments.
                                </div>
                              ) : (
                                morningBookings.map((b) => {
                                  const isPending = b.status === "pending";
                                  const timeStr = b.scheduled_at?.split("T")[1]?.slice(0, 5) || "10:00";
                                  return (
                                    <div
                                      key={b.ref}
                                      className={`timeline-slot-row ${isPending ? "is-pending" : "is-confirmed"}`}
                                      onClick={() => setActiveDrawerBooking(b)}
                                      role="button"
                                      tabIndex={0}
                                      style={{
                                        display: "flex",
                                        alignItems: "stretch",
                                        gap: "12px",
                                        marginBottom: "10px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      <div className="timeline-time-col">
                                        <strong>{timeStr}</strong>
                                        <span>{b.duration_min || 45}m</span>
                                      </div>
                                      <div
                                        className="timeline-card-content"
                                        style={{
                                          flex: 1,
                                          borderRadius: "18px",
                                          padding: "14px 16px",
                                          background: isPending ? "var(--admin-pulse-bg, #FBEBC8)" : "#FFFFFF",
                                          border: isPending ? "1px solid rgba(217, 119, 6, 0.28)" : "1px solid rgba(0, 0, 0, 0.06)",
                                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "6px",
                                        }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <span
                                              style={{
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "50%",
                                                background: isPending ? "#D97706" : "var(--admin-accent, #111)",
                                                color: "#FFFFFF",
                                                fontSize: "0.72rem",
                                                fontWeight: 700,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                              }}
                                            >
                                              {(b.client_name ?? "G").charAt(0).toUpperCase()}
                                            </span>
                                            <div>
                                              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>
                                                {b.client_name}
                                              </div>
                                              <div style={{ fontSize: "0.76rem", color: "var(--admin-sheet-muted, #6B7280)" }}>
                                                {b.service_name}
                                              </div>
                                            </div>
                                          </div>
                                          <div style={{ textAlign: "right" }}>
                                            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#111827" }}>
                                              {b.service_price ? `${b.service_price} kr` : "850 kr"}
                                            </div>
                                            <span
                                              className={`status-pill-badge ${b.status}`}
                                              style={{
                                                fontSize: "0.62rem",
                                                padding: "2px 7px",
                                                borderRadius: "999px",
                                                fontWeight: 700,
                                                textTransform: "uppercase",
                                              }}
                                            >
                                              {b.status}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Afternoon Sessions (>= 12:00) */}
                            <div className="agenda-block">
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", fontSize: "0.78rem", fontWeight: 700, color: "var(--admin-sheet-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                <span>🌙</span> Afternoon Sessions ({afternoonBookings.length})
                              </div>
                              {afternoonBookings.length === 0 ? (
                                <div style={{ padding: "12px 14px", borderRadius: "14px", background: "rgba(0,0,0,0.02)", color: "#888", fontSize: "0.78rem" }}>
                                  No afternoon appointments.
                                </div>
                              ) : (
                                afternoonBookings.map((b) => {
                                  const isPending = b.status === "pending";
                                  const timeStr = b.scheduled_at?.split("T")[1]?.slice(0, 5) || "14:00";
                                  return (
                                    <div
                                      key={b.ref}
                                      className={`timeline-slot-row ${isPending ? "is-pending" : "is-confirmed"}`}
                                      onClick={() => setActiveDrawerBooking(b)}
                                      role="button"
                                      tabIndex={0}
                                      style={{
                                        display: "flex",
                                        alignItems: "stretch",
                                        gap: "12px",
                                        marginBottom: "10px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      <div className="timeline-time-col">
                                        <strong>{timeStr}</strong>
                                        <span>{b.duration_min || 60}m</span>
                                      </div>
                                      <div
                                        className="timeline-card-content"
                                        style={{
                                          flex: 1,
                                          borderRadius: "18px",
                                          padding: "14px 16px",
                                          background: isPending ? "var(--admin-pulse-bg, #FBEBC8)" : "#FFFFFF",
                                          border: isPending ? "1px solid rgba(217, 119, 6, 0.28)" : "1px solid rgba(0, 0, 0, 0.06)",
                                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "6px",
                                        }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <span
                                              style={{
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "50%",
                                                background: isPending ? "#D97706" : "var(--admin-accent, #111)",
                                                color: "#FFFFFF",
                                                fontSize: "0.72rem",
                                                fontWeight: 700,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                              }}
                                            >
                                              {(b.client_name ?? "G").charAt(0).toUpperCase()}
                                            </span>
                                            <div>
                                              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>
                                                {b.client_name}
                                              </div>
                                              <div style={{ fontSize: "0.76rem", color: "var(--admin-sheet-muted, #6B7280)" }}>
                                                {b.service_name}
                                              </div>
                                            </div>
                                          </div>
                                          <div style={{ textAlign: "right" }}>
                                            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#111827" }}>
                                              {b.service_price ? `${b.service_price} kr` : "1900 kr"}
                                            </div>
                                            <span
                                              className={`status-pill-badge ${b.status}`}
                                              style={{
                                                fontSize: "0.62rem",
                                                padding: "2px 7px",
                                                borderRadius: "999px",
                                                fontWeight: 700,
                                                textTransform: "uppercase",
                                              }}
                                            >
                                              {b.status}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              </section>
            )}

            {/* ============================================================= */}
            {/* TAB 2: APPOINTMENTS (Active Feed & Collapsible Archive)       */}
            {/* ============================================================= */}
            {activeTab === "avtaler" && (
              <section className="tab-panel active" id="panel-avtaler">
                <div className="appointments-sticky-head">
                  <div className="search-filter-wrap" style={{ position: "relative" }}>
                    <svg
                      className="search-icon-pos"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      id="admin-search-input"
                      className="admin-search-input"
                      placeholder="Search by client, phone, email, or ref..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                    />
                  </div>

                  <div className="filter-pills-row jelly-radio-track" style={{ position: "relative", display: "flex", gap: "6px", overflowX: "auto", padding: "4px 0" }}>
                    {[
                      { id: "active", label: "Active", count: bookings.filter((b) => b.status === "pending" || b.status === "confirmed").length },
                      { id: "pending", label: "Pending", count: pendingBookings.length },
                      { id: "confirmed", label: "Upcoming", count: confirmedBookings.length },
                      { id: "archive", label: "Archive", count: bookings.filter((b) => b.status === "declined" || b.status === "cancelled").length },
                      { id: "all", label: "All", count: bookings.length },
                    ].map((tab) => {
                      const isActive = segmentFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          className={`feed-filter-pill ${isActive ? "active" : ""}`}
                          onClick={() => setSegmentFilter(tab.id as any)}
                          style={{
                            position: "relative",
                            zIndex: 2,
                            background: "transparent",
                            border: isActive ? "none" : "1px solid rgba(0, 0, 0, 0.08)",
                            color: isActive ? "#FFFFFF" : "var(--admin-sheet-muted)",
                            padding: "6px 14px",
                            borderRadius: "9999px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            transition: "color 0.18s ease",
                          }}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="jellyActivePill"
                              className="jelly-pill-bg"
                              transition={{
                                type: "spring",
                                stiffness: 420,
                                damping: 26,
                                mass: 0.8,
                              }}
                              style={{
                                position: "absolute",
                                inset: 0,
                                borderRadius: "9999px",
                                background: "var(--admin-pill-active-bg, #111111)",
                                zIndex: -1,
                                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                              }}
                            />
                          )}
                          <span>{tab.label} ({tab.count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div id="bookings-active-feed">
                  {filteredBookings.length === 0 ? (
                    <div className="timeline-empty-card">
                      <p>No appointments match the filter.</p>
                    </div>
                  ) : (
                    filteredBookings.map((b) => {
                      const isPending = b.status === "pending";
                      const isArchived = b.status === "declined" || b.status === "cancelled";
                      const emailFailed = ["bounced", "failed", "suppressed", "complained"].includes(b.email_status || "");
                      const initials = (b.client_name ?? "Guest")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();
                      const dateStr = b.scheduled_at ? b.scheduled_at.split("T")[0] : "2026-10-30";
                      const timeStr = b.scheduled_at ? b.scheduled_at.split("T")[1]?.slice(0, 5) : "12:00";

                      return (
                        <div
                          key={b.ref}
                          className={`booking-item-card ${isPending ? "is-pending" : ""} ${isArchived ? "is-archive" : ""}`}
                          data-ref={b.ref}
                          onClick={() => setActiveDrawerBooking(b)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="booking-card-top-row">
                            <span className="client-avatar-circle">{initials}</span>
                            <div className="client-title-info">
                              <div className="client-row-name">{b.client_name}</div>
                              <div className="client-row-service">
                                {b.service_name} · {b.duration_min || 45} min
                              </div>
                            </div>
                            <div className="client-status-col">
                              <span className={`status-pill-badge ${b.status}`}>
                                {isPending ? "PENDING REVIEW" : b.status.toUpperCase()}
                              </span>
                              <div className="card-price-tag">{b.service_price || 850} kr</div>
                            </div>
                          </div>

                          <div className="booking-meta-row">
                            <div className="booking-meta-primary">
                              {dateStr}<span className="meta-sep">·</span>{timeStr}
                            </div>
                            {b.client_email && (
                              <div className="booking-meta-secondary" title={b.client_email}>
                                {b.client_email}
                              </div>
                            )}
                            {emailFailed && (
                              <div className="booking-meta-alert" title={b.email_error || "Confirmation was not delivered"}>
                                Email not delivered
                              </div>
                            )}
                          </div>

                          {isPending && (
                            <div className="triage-action-row" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="btn-triage btn-triage-approve"
                                disabled={triageActionRef === `${b.ref}-confirmed`}
                                onClick={() => handleApproveWithGuard(b.ref, b.email_status)}
                              >
                                {triageActionRef === `${b.ref}-confirmed` ? (
                                  <span className="save-spinner" style={{ width: "10px", height: "10px", borderTopColor: "#fff" }} />
                                ) : (
                                  "Approve"
                                )}
                              </button>
                              <button
                                type="button"
                                className="btn-triage btn-triage-decline"
                                disabled={triageActionRef === `${b.ref}-declined`}
                                onClick={() => handleBookingStatus(b.ref, "declined")}
                              >
                                {triageActionRef === `${b.ref}-declined` ? (
                                  <span className="save-spinner" style={{ width: "10px", height: "10px", borderTopColor: "#DC2626" }} />
                                ) : (
                                  "Decline"
                                )}
                              </button>
                              <button
                                type="button"
                                className="btn-triage btn-triage-details"
                                onClick={() => setActiveDrawerBooking(b)}
                              >
                                Details
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Collapsible Archive Accordion */}
                <div className="archive-accordion-box">
                  <div
                    className="archive-toggle-head"
                    id="archive-toggle-head"
                    onClick={() => setArchiveExpanded(!archiveExpanded)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="archive-toggle-title">
                      <span>🗄 Past & Cancelled Appointments</span>
                      <span className="archive-count-badge" id="archive-total-badge">
                        {bookings.filter((b) => b.status === "declined" || b.status === "cancelled").length}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--admin-sheet-muted)" }} id="archive-chevron">
                      {archiveExpanded ? "Hide Archive ▲" : "View Archive ▼"}
                    </span>
                  </div>
                  {archiveExpanded && (
                    <div className="archive-content-body" style={{ display: "block" }}>
                      {bookings
                        .filter((b) => b.status === "declined" || b.status === "cancelled")
                        .map((b) => (
                          <div key={b.ref} className="booking-item-card" style={{ opacity: 0.85 }}>
                            <strong>{b.client_name}</strong> · {b.service_name} ({b.status})
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ============================================================= */}
            {/* TAB 3: OPENING HOURS & SHIFTS                                */}
            {/* ============================================================= */}
            {activeTab === "schedule" && (
              <section className="tab-panel active tab-pane-padded" id="panel-schedule">
                {/* Segmented Control: Weekly vs Plan Ahead */}
                <div className="schedule-segmented-tabs">
                  <button
                    type="button"
                    className={`schedule-segment-btn ${scheduleSubTab === "weekly" ? "active" : ""}`}
                    onClick={() => setScheduleSubTab("weekly")}
                  >
                    Weekly Operating Hours
                  </button>
                  <button
                    type="button"
                    className={`schedule-segment-btn ${scheduleSubTab === "plan_ahead" ? "active" : ""}`}
                    onClick={() => setScheduleSubTab("plan_ahead")}
                  >
                    Plan Ahead & Custom Dates
                  </button>
                </div>

                {scheduleSubTab === "weekly" ? (
                  <div className="squircle-card">
                    <div className="card-section-head">
                      <div>
                        <h3 className="card-title-main">Studio Operating Hours</h3>
                        <span className="card-subtitle">Weekly shifts and appointment slot duration</span>
                      </div>
                      <button
                        type="button"
                        className="btn-ny-time"
                        id="btn-copy-monday"
                        style={{ fontSize: "0.72rem", padding: "6px 12px" }}
                        onClick={() => {
                          const mon = shifts["Monday"];
                          setShifts({
                            Monday: { ...mon },
                            Tuesday: { ...mon },
                            Wednesday: { ...mon },
                            Thursday: { ...mon },
                            Friday: { ...mon },
                            Saturday: { ...mon },
                            Sunday: { ...mon },
                          });
                          showToast("✓ Copied Monday hours to all days");
                        }}
                      >
                        Copy Monday
                      </button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "14px",
                        fontSize: "0.8rem",
                        gap: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "var(--admin-sheet-muted)" }}>
                        Appointment Slot Duration:
                      </span>
                      <select
                        id="sched-interval"
                        className="pill-time-input"
                        value={slotInterval}
                        onChange={(e) => setSlotInterval(e.target.value)}
                        style={{ padding: "6px 12px" }}
                      >
                        <option value="15">15 min</option>
                        <option value="30">30 min</option>
                        <option value="45">45 min</option>
                        <option value="60">60 min</option>
                      </select>
                    </div>

                    {/* 7-Day Responsive Shift Cards (Tier 1: Day & Toggle, Tier 2: Time Pickers) */}
                    <div id="schedule-days-container" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {Object.entries(shifts).map(([day, shift]) => (
                        <div
                          key={day}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "14px",
                            background: shift.open ? "#FFFFFF" : "rgba(0, 0, 0, 0.02)",
                            border: "1px solid rgba(0, 0, 0, 0.06)",
                            marginBottom: "8px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 700, fontSize: "0.88rem", color: shift.open ? "#111827" : "#9CA3AF" }}>
                                {day}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  padding: "2px 7px",
                                  borderRadius: "6px",
                                  background: shift.open ? "rgba(22, 163, 74, 0.1)" : "rgba(0, 0, 0, 0.05)",
                                  color: shift.open ? "#15803D" : "#6B7280",
                                  textTransform: "uppercase",
                                }}
                              >
                                {shift.open ? "Open" : "Closed"}
                              </span>
                            </div>
                            <label className="switch-label">
                              <input
                                type="checkbox"
                                checked={shift.open}
                                onChange={(e) =>
                                  setShifts({
                                    ...shifts,
                                    [day]: { ...shift, open: e.target.checked },
                                  })
                                }
                              />
                              <span className="switch-slider" />
                            </label>
                          </div>
                          {shift.open && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                              <EditorialTimePicker
                                value={shift.start}
                                onChange={(val) =>
                                  setShifts({
                                    ...shifts,
                                    [day]: { ...shift, start: val },
                                  })
                                }
                                style={{ flex: 1 }}
                              />
                              <span style={{ color: "var(--admin-sheet-muted)", fontSize: "0.85rem" }}>–</span>
                              <EditorialTimePicker
                                value={shift.end}
                                onChange={(val) =>
                                  setShifts({
                                    ...shifts,
                                    [day]: { ...shift, end: val },
                                  })
                                }
                                style={{ flex: 1 }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="squircle-card">
                    <div className="card-section-head">
                      <div>
                        <h3 className="card-title-main">Plan Ahead & Date Overrides</h3>
                        <span className="card-subtitle">Select dates to set custom hours or mark closed</span>
                      </div>
                    </div>

                    {/* Month Navigator Header */}
                    <div className="plan-ahead-month-header">
                      <button
                        type="button"
                        className="quick-action-btn"
                        style={{ padding: "6px 12px", minWidth: "36px" }}
                        onClick={() => {
                          if (planAheadMonth === 0) {
                            setPlanAheadMonth(11);
                            setPlanAheadYear((y) => y - 1);
                          } else {
                            setPlanAheadMonth((m) => m - 1);
                          }
                        }}
                      >
                        ‹
                      </button>
                      <h4 style={{ margin: 0, fontSize: "0.96rem", fontWeight: 700, color: "#111827" }}>
                        {new Date(Date.UTC(planAheadYear, planAheadMonth, 1)).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </h4>
                      <button
                        type="button"
                        className="quick-action-btn"
                        style={{ padding: "6px 12px", minWidth: "36px" }}
                        onClick={() => {
                          if (planAheadMonth === 11) {
                            setPlanAheadMonth(0);
                            setPlanAheadYear((y) => y + 1);
                          } else {
                            setPlanAheadMonth((m) => m + 1);
                          }
                        }}
                      >
                        ›
                      </button>
                    </div>

                    {/* Quick Selection Helpers */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
                      <button
                        type="button"
                        className="plan-ahead-chip"
                        onClick={() => {
                          const monthCells = getMonthGridDays(planAheadYear, planAheadMonth).filter((c) => c.isCurrentMonth);
                          setSelectedPlanDates(monthCells.map((c) => c.iso));
                        }}
                      >
                        Select Entire Month
                      </button>
                      <button
                        type="button"
                        className="plan-ahead-chip"
                        onClick={() => {
                          const monthCells = getMonthGridDays(planAheadYear, planAheadMonth).filter((c) => {
                            if (!c.isCurrentMonth) return false;
                            const d = new Date(c.iso).getUTCDay();
                            return d === 0 || d === 6;
                          });
                          setSelectedPlanDates(monthCells.map((c) => c.iso));
                        }}
                      >
                        Weekends Only
                      </button>
                      <button
                        type="button"
                        className="plan-ahead-chip"
                        onClick={() => {
                          const monthCells = getMonthGridDays(planAheadYear, planAheadMonth).filter((c) => {
                            if (!c.isCurrentMonth) return false;
                            const d = new Date(c.iso).getUTCDay();
                            return d >= 1 && d <= 5;
                          });
                          setSelectedPlanDates(monthCells.map((c) => c.iso));
                        }}
                      >
                        Weekdays Only
                      </button>
                      {selectedPlanDates.length > 0 && (
                        <button
                          type="button"
                          className="plan-ahead-chip"
                          style={{ borderColor: "#DC2626", color: "#DC2626" }}
                          onClick={() => setSelectedPlanDates([])}
                        >
                          Clear ({selectedPlanDates.length})
                        </button>
                      )}
                    </div>

                    {/* Calendar Grid for Plan Ahead */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "16px" }}>
                      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                        <div key={i} style={{ textAlign: "center", fontSize: "0.68rem", fontWeight: 700, color: "var(--admin-sheet-muted)", padding: "4px 0" }}>
                          {d}
                        </div>
                      ))}
                      {getMonthGridDays(planAheadYear, planAheadMonth).map((cell, idx) => {
                        const isSelected = selectedPlanDates.includes(cell.iso);
                        const override = dateOverrides[cell.iso];
                        const isToday = cell.iso === new Date().toISOString().split("T")[0];
                        const weekdayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(cell.iso + "T00:00:00Z").getUTCDay()];
                        const standardClosed = shifts[weekdayName]?.open === false;
                        const isOverrideClosed = override?.open === false;
                        const isClosedDay = override ? isOverrideClosed : standardClosed;

                        return (
                          <button
                            key={`${cell.iso}-${idx}`}
                            type="button"
                            className={`plan-ahead-cell ${isSelected ? "is-selected" : ""} ${override ? "has-override" : ""} ${isClosedDay ? "is-closed-day" : ""}`}
                            style={{ opacity: cell.isCurrentMonth ? 1 : 0.35 }}
                            onClick={() => {
                              setSelectedPlanDates((prev) =>
                                prev.includes(cell.iso) ? prev.filter((d) => d !== cell.iso) : [...prev, cell.iso]
                              );
                            }}
                          >
                            <span style={{ fontSize: "0.82rem", fontWeight: isToday ? 800 : 600 }}>{cell.dayNum}</span>
                            {isClosedDay && <span className="closed-mark-dot" title="Closed">✕</span>}
                            {override && (
                              <span className={`plan-ahead-override-badge ${override.open === false ? "is-closed" : ""}`}>
                                {override.open === false ? "Closed" : `${override.start?.slice(0, 5)}`}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Configuration Dock Card when dates are selected */}
                    {selectedPlanDates.length > 0 && (
                      <div className="plan-ahead-dock-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#111827" }}>
                            {selectedPlanDates.length} date{selectedPlanDates.length === 1 ? "" : "s"} selected
                          </span>
                          <label className="switch-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: planIsClosed ? "#DC2626" : "#15803D" }}>
                              {planIsClosed ? "Mark Closed" : "Open with Hours"}
                            </span>
                            <input
                              type="checkbox"
                              checked={!planIsClosed}
                              onChange={(e) => setPlanIsClosed(!e.target.checked)}
                            />
                            <span className="switch-slider" />
                          </label>
                        </div>

                        {!planIsClosed && !isCustomizingDates && (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                            <EditorialTimePicker
                              value={planCustomStart}
                              onChange={setPlanCustomStart}
                              style={{ flex: 1 }}
                            />
                            <span style={{ color: "var(--admin-sheet-muted)", fontSize: "0.85rem" }}>–</span>
                            <EditorialTimePicker
                              value={planCustomEnd}
                              onChange={setPlanCustomEnd}
                              style={{ flex: 1 }}
                            />
                          </div>
                        )}

                        {/* Granular per-date customization toggle */}
                        <div style={{ marginTop: "8px", marginBottom: "12px", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "8px" }}>
                          <button
                            type="button"
                            className="quick-action-btn"
                            style={{ width: "100%", justifyContent: "space-between", padding: "6px 10px", fontSize: "0.74rem" }}
                            onClick={() => setIsCustomizingDates(!isCustomizingDates)}
                          >
                            <span>⚙ Customize Each Date Individually ({selectedPlanDates.length})</span>
                            <span>{isCustomizingDates ? "▲ Close" : "▼ Expand"}</span>
                          </button>

                          {isCustomizingDates && (
                            <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                              {selectedPlanDates.map((d) => {
                                const cur = perDateCustomTimes[d] || {
                                  open: !planIsClosed,
                                  start: planCustomStart,
                                  end: planCustomEnd,
                                };
                                const dateLabel = new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  timeZone: "UTC",
                                });

                                return (
                                  <div
                                    key={d}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: "8px",
                                      padding: "8px 10px",
                                      background: "#FFFFFF",
                                      border: "1px solid rgba(0,0,0,0.06)",
                                      borderRadius: "10px",
                                    }}
                                  >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#111827" }}>{dateLabel}</div>
                                      <label className="switch-label" style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: cur.open ? "#15803D" : "#DC2626" }}>
                                          {cur.open ? "Open" : "Closed"}
                                        </span>
                                        <input
                                          type="checkbox"
                                          checked={cur.open}
                                          onChange={(e) => {
                                            setPerDateCustomTimes((prev) => ({
                                              ...prev,
                                              [d]: { ...cur, open: e.target.checked },
                                            }));
                                          }}
                                        />
                                        <span className="switch-slider" style={{ transform: "scale(0.8)" }} />
                                      </label>
                                    </div>

                                    {cur.open && (
                                      <div style={{ display: "flex", alignItems: "center", gap: "4px", width: "170px" }}>
                                        <EditorialTimePicker
                                          value={cur.start}
                                          onChange={(t) => setPerDateCustomTimes((prev) => ({ ...prev, [d]: { ...cur, start: t } }))}
                                        />
                                        <span style={{ fontSize: "0.74rem", color: "#6B7280" }}>–</span>
                                        <EditorialTimePicker
                                          value={cur.end}
                                          onChange={(t) => setPerDateCustomTimes((prev) => ({ ...prev, [d]: { ...cur, end: t } }))}
                                        />
                                      </div>
                                    )}

                                    <button
                                      type="button"
                                      style={{
                                        border: "none",
                                        background: "transparent",
                                        color: "#DC2626",
                                        fontSize: "0.85rem",
                                        cursor: "pointer",
                                        padding: "4px",
                                        lineHeight: 1,
                                      }}
                                      onClick={() => setSelectedPlanDates((prev) => prev.filter((x) => x !== d))}
                                      title="Remove date from selection"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="btn-ny-time"
                            style={{ flex: 1, padding: "8px 12px", fontSize: "0.76rem", justifyContent: "center" }}
                            onClick={async () => {
                              const count = selectedPlanDates.length;
                              const nextOverrides = { ...dateOverrides };
                              selectedPlanDates.forEach((d) => {
                                if (isCustomizingDates && perDateCustomTimes[d]) {
                                  const custom = perDateCustomTimes[d];
                                  if (custom.open === false) {
                                    nextOverrides[d] = { open: false };
                                  } else {
                                    nextOverrides[d] = {
                                      open: true,
                                      start: custom.start,
                                      end: custom.end,
                                      shifts: [{ start: custom.start, end: custom.end }],
                                    };
                                  }
                                } else {
                                  if (planIsClosed) {
                                    nextOverrides[d] = { open: false };
                                  } else {
                                    nextOverrides[d] = {
                                      open: true,
                                      start: planCustomStart,
                                      end: planCustomEnd,
                                      shifts: [{ start: planCustomStart, end: planCustomEnd }],
                                    };
                                  }
                                }
                              });
                              setDateOverrides(nextOverrides);
                              setSelectedPlanDates([]);
                              setIsCustomizingDates(false);
                              try {
                                const res = await fetch("/api/admin/hours", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    tenant_id: activeTenant || session?.tenant_id || "gangina",
                                    shifts,
                                    interval_min: Number(slotInterval),
                                    date_overrides: nextOverrides,
                                  }),
                                });
                                if (res.ok) {
                                  showToast(`✓ Overrides saved (${count} dates)`);
                                } else {
                                  showToast("Could not persist overrides to database");
                                }
                              } catch (_) {
                                showToast("Could not persist overrides to database");
                              }
                            }}
                          >
                            Apply Override ({selectedPlanDates.length})
                          </button>
                          <button
                            type="button"
                            className="quick-action-btn"
                            style={{ padding: "8px 12px", fontSize: "0.76rem" }}
                            onClick={async () => {
                              const count = selectedPlanDates.length;
                              const nextOverrides = { ...dateOverrides };
                              selectedPlanDates.forEach((d) => {
                                delete nextOverrides[d];
                              });
                              setDateOverrides(nextOverrides);
                              setSelectedPlanDates([]);
                              setIsCustomizingDates(false);
                              try {
                                const res = await fetch("/api/admin/hours", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    tenant_id: activeTenant || session?.tenant_id || "gangina",
                                    shifts,
                                    interval_min: Number(slotInterval),
                                    date_overrides: nextOverrides,
                                  }),
                                });
                                if (res.ok) {
                                  showToast(`✓ Reset ${count} date(s) to defaults`);
                                }
                              } catch (_) {}
                            }}
                          >
                            Reset Defaults
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Active Blackouts Table Card */}
                <div className="squircle-card">
                  <div className="card-section-head">
                    <div>
                      <h3 className="card-title-main">Active Blackouts & Breaks</h3>
                      <span className="card-subtitle">Personal leaves, lunch breaks, and holidays</span>
                    </div>
                    <button
                      type="button"
                      className="quick-action-btn"
                      id="btn-add-blackout-tab"
                      style={{ padding: "6px 12px" }}
                      onClick={() => setShowBlockTimeModal(true)}
                    >
                      + Block Time
                    </button>
                  </div>

                  <div id="blocked-intervals-list" style={{ marginTop: "10px" }}>
                    {blackouts.length === 0 ? (
                      <p style={{ fontSize: "0.8rem", color: "var(--admin-sheet-muted)", margin: "8px 0" }}>
                        No upcoming blackout periods configured.
                      </p>
                    ) : (
                      blackouts.map((b, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "8px 0",
                            borderBottom: "1px solid #f0f0f0",
                            fontSize: "0.8rem",
                          }}
                        >
                          <span>{b.reason || "Studio Pause"}</span>
                          <strong>{b.starts_at?.split("T")[0]}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ============================================================= */}
            {/* TAB 4: STUDIO SETTINGS & THEME                               */}
            {/* ============================================================= */}
            {activeTab === "settings" && (
              <section className="tab-panel active tab-pane-padded" id="panel-settings">
                {/* Theme Palette Swatches (Moved to Top) */}
                <div className="squircle-card">
                  <div className="card-section-head">
                    <div>
                      <h3 className="card-title-main">Color & Theme</h3>
                      <span className="card-subtitle">Sanzo Wada 1930s 'A Dictionary of Color Combinations'</span>
                    </div>
                  </div>

                  <div className="palette-swatches-grid" id="theme-presets-grid">
                    {THEME_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`palette-btn ${activeTheme === p.id ? "active" : ""}`}
                        data-preset={p.id}
                        onClick={() => handleSelectPreset(p.id)}
                      >
                        <div className="swatch-chip">
                          <div className="swatch-chip-canopy" style={{ backgroundColor: p.canopy }} />
                          <div className="swatch-chip-accent" style={{ backgroundColor: p.accent }} />
                        </div>
                        <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
                          <span className="palette-name">{p.name}</span>
                          <span className="palette-desc">{p.desc}</span>
                        </div>
                        {activeTheme === p.id && <span className="palette-check-dot">●</span>}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`palette-btn palette-btn-custom ${activeTheme === "custom" ? "active" : ""}`}
                      data-preset="custom"
                      onClick={() => setShowCustomThemeSheet(true)}
                    >
                      <div className="swatch-chip">
                        <div className="swatch-chip-custom" />
                      </div>
                      <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
                        <span className="palette-name">Custom</span>
                        <span className="palette-desc">Manual HEX</span>
                      </div>
                      {activeTheme === "custom" && <span className="palette-check-dot">●</span>}
                    </button>
                  </div>
                </div>

                {/* Studio Profile */}
                <div className="squircle-card">
                  <div className="card-section-head">
                    <div>
                      <h3 className="card-title-main">Studio Profile</h3>
                      <span className="card-subtitle">Manage public contact and invoice details</span>
                    </div>
                  </div>

                  <div className="modal-grid-2">
                    <div className="recessed-input-group">
                      <label className="recessed-label" htmlFor="studio-name-input">
                        Studio Name
                      </label>
                      <input
                        type="text"
                        id="studio-name-input"
                        className="recessed-input"
                        value={tenantProfile.name}
                        onChange={(e) => setTenantProfile({ ...tenantProfile, name: e.target.value })}
                      />
                    </div>
                    <div className="recessed-input-group">
                      <label className="recessed-label" htmlFor="studio-org-input">
                        Organization Number
                      </label>
                      <input
                        type="text"
                        id="studio-org-input"
                        className="recessed-input"
                        placeholder="987 654 321 MVA"
                        value={tenantProfile.org_number || ""}
                        onChange={(e) => setTenantProfile({ ...tenantProfile, org_number: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="recessed-input-group">
                    <label className="recessed-label" htmlFor="studio-address-input">
                      Street Address
                    </label>
                    <input
                      type="text"
                      id="studio-address-input"
                      className="recessed-input"
                      placeholder="Dronningens gate 15, 0152 Oslo"
                      value={tenantProfile.address || ""}
                      onChange={(e) => setTenantProfile({ ...tenantProfile, address: e.target.value })}
                    />
                  </div>

                  <div className="modal-grid-2">
                    <div className="recessed-input-group">
                      <label className="recessed-label" htmlFor="studio-whatsapp-input">
                        WhatsApp Number
                      </label>
                      <input
                        type="tel"
                        id="studio-whatsapp-input"
                        className="recessed-input"
                        placeholder="+47 900 00 000"
                        value={tenantProfile.whatsapp || ""}
                        onChange={(e) => setTenantProfile({ ...tenantProfile, whatsapp: e.target.value })}
                      />
                    </div>
                    <div className="recessed-input-group">
                      <label className="recessed-label" htmlFor="studio-contact-email-input">
                        Public Client Email
                      </label>
                      <input
                        type="email"
                        id="studio-contact-email-input"
                        className="recessed-input"
                        placeholder="booking@studio.com"
                        value={tenantProfile.contact_email || ""}
                        onChange={(e) => setTenantProfile({ ...tenantProfile, contact_email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="recessed-input-group">
                    <label className="recessed-label" htmlFor="studio-owner-email-input">
                      Private Owner Email
                    </label>
                    <input
                      type="email"
                      id="studio-owner-email-input"
                      className="recessed-input"
                      value={tenantProfile.owner_email || ""}
                      onChange={(e) => setTenantProfile({ ...tenantProfile, owner_email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Activity Log Audit Feed */}
                <div className="squircle-card">
                  <div className="card-section-head">
                    <div>
                      <h3 className="card-title-main">Activity log</h3>
                      <span className="card-subtitle">Who approved, moved or emailed a booking, and when</span>
                    </div>
                    <button
                      type="button"
                      id="activity-refresh-btn"
                      className="quick-action-btn"
                      style={{ padding: "8px 12px", whiteSpace: "nowrap" }}
                      onClick={async () => {
                        const res = await fetch(`/api/admin/audit?tenant_id=${encodeURIComponent(activeTenant)}`);
                        if (res.ok) {
                          const data = await res.json();
                          if (Array.isArray(data.events)) setActivityLogs(data.events);
                          showToast("✓ Activity log refreshed");
                        }
                      }}
                    >
                      ↻ Refresh
                    </button>
                  </div>

                  <div id="activity-list" className="activity-list" aria-live="polite">
                    {activityLogs.length === 0 ? (
                      <p className="activity-empty">No activity events recorded yet.</p>
                    ) : (
                      activityLogs.map((ev, idx) => (
                        <div key={idx} className="activity-row">
                          <span className="activity-action">{ev.action}</span>
                          <span className="activity-time">
                            {new Date(ev.created_at).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="activity-meta">
                            By {ev.actor_email || "system"} {ev.booking_ref && `· Ref: ${ev.booking_ref}`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>

        {/* Permanently Docked Action Bar: Opening Hours */}
        {activeTab === "schedule" && (
          <div className="docked-save-bar" id="docked-schedule-bar">
            <button
              type="button"
              id="save-sched-btn"
              className="btn-ny-time"
              disabled={isSavingHours}
              style={{ width: "100%", justifyContent: "center", padding: "12px", borderRadius: "9999px", opacity: isSavingHours ? 0.7 : 1 }}
              onClick={async () => {
                setIsSavingHours(true);
                try {
                  const res = await fetch("/api/admin/hours", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      tenant_id: activeTenant || session?.tenant_id || "gangina",
                      shifts,
                      interval_min: Number(slotInterval),
                      date_overrides: dateOverrides,
                    }),
                  });
                  if (res.ok) {
                    showToast("✓ Operating hours saved to database");
                  } else {
                    showToast("Could not save operating hours");
                  }
                } catch (_) {
                  showToast("Could not save operating hours");
                } finally {
                  setIsSavingHours(false);
                }
              }}
            >
              {isSavingHours ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <span className="save-spinner" aria-hidden="true" />
                  Saving operating hours…
                </span>
              ) : (
                "Save Operating Hours"
              )}
            </button>
          </div>
        )}

        {/* Permanently Docked Action Bar: Settings */}
        {activeTab === "settings" && (
          <div className="docked-save-bar" id="docked-settings-bar">
            <button
              type="button"
              id="save-settings-btn"
              className="btn-ny-time"
              disabled={isSavingSettings}
              style={{ flex: 1, justifyContent: "center", padding: "12px", borderRadius: "9999px", opacity: isSavingSettings ? 0.7 : 1 }}
              onClick={handleSaveSettings}
            >
              {isSavingSettings ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <span className="save-spinner" aria-hidden="true" />
                  Saving studio settings…
                </span>
              ) : (
                "Save Studio Settings"
              )}
            </button>
            <button
              type="button"
              id="send-test-alert-btn"
              className="quick-action-btn"
              style={{ padding: "12px 18px", borderRadius: "9999px", flexShrink: 0 }}
              onClick={async () => {
                try {
                  const res = await fetch("/api/admin/settings/test-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tenant_id: activeTenant }),
                  });
                  if (res.ok) showToast("✓ Test ping email delivered");
                  else showToast("Could not send test email");
                } catch (_) {
                  showToast("Network error sending test email");
                }
              }}
            >
              Send Test Ping
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* 3. ADAPTIVE FLOATING BOTTOM NAVIGATION DOCK                         */}
        {/* =================================================================== */}
        <nav className="adaptive-pill-dock" id="adaptive-pill-dock" ref={dockRef} aria-label="Admin Navigation">
          <div className="dock-slider-indicator" id="dock-slider-indicator" ref={indicatorRef} aria-hidden="true" />
          <button
            type="button"
            className={`dock-pill ${activeTab === "kalender" ? "active" : ""}`}
            onClick={() => switchTab("kalender")}
            aria-label="Calendar"
          >
            <svg viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="dock-label">Calendar</span>
          </button>

          <button
            type="button"
            className={`dock-pill ${activeTab === "avtaler" ? "active" : ""}`}
            onClick={() => switchTab("avtaler")}
            aria-label="Appointments"
          >
            <svg viewBox="0 0 24 24">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <path d="M9 14l2 2 4-4" />
            </svg>
            <span className="dock-label">Appointments</span>
            {pendingBookings.length > 0 && (
              <span className="dock-badge" id="dock-pending-badge" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            className={`dock-pill ${activeTab === "schedule" ? "active" : ""}`}
            onClick={() => switchTab("schedule")}
            aria-label="Opening Hours"
          >
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="dock-label">Opening Hours</span>
          </button>

          <button
            type="button"
            className={`dock-pill ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => switchTab("settings")}
            aria-label="Settings"
          >
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="dock-label">Settings</span>
          </button>
        </nav>
      </div>

      {/* =================================================================== */}
      {/* 4. MODALS & CLIENT DETAILS BOTTOM SHEET (Framer Motion Fluidity)    */}
      {/* =================================================================== */}

      {/* MODAL 1: Client Details Bottom Sheet / Inspector */}
      <AnimatePresence>
        {activeDrawerBooking && (
          <div
            className="modal-backdrop open"
            id="modal-client-drawer"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveDrawerBooking(null);
            }}
          >
            <motion.div
              className="modal-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              drag="y"
              dragControls={drawerDragControls}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.25 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 200) {
                  setActiveDrawerBooking(null);
                }
              }}
            >
              {/* Brand Watermark Backdrop Layer */}
              <div className="drawer-brand-watermark" aria-hidden="true">
                <img src={tenantProfile.logo_url || "/img/logo-v2.png"} alt="" className="drawer-brand-watermark-img" />
              </div>

              {/* Dedicated Drag Handle Pill */}
              <div
                className="modal-top-handle"
                role="button"
                tabIndex={0}
                aria-label="Dismiss sheet"
                onPointerDown={(e) => drawerDragControls.start(e)}
                onClick={() => setActiveDrawerBooking(null)}
              />

              {/* Scrollable middle body styled as The Atelier Studio Pass */}
              <div className="modal-sheet-scroll-body" style={{ paddingTop: "6px" }}>
                {/* 1. Atelier Header: Clean Reference & Client Identity */}
                <div className="atelier-header-block">
                  <div className="atelier-header-meta">
                    <div className="atelier-meta-left">
                      <span className="atelier-ref-text" id="drawer-ref-pill">№ {activeDrawerBooking.ref}</span>
                      <span className="atelier-meta-dot">•</span>
                      <span className="atelier-tenant-text">{tenantProfile.name || "Studio"}</span>
                    </div>
                    <button
                      type="button"
                      className="modal-sheet-close"
                      id="close-client-drawer-btn"
                      onClick={() => setActiveDrawerBooking(null)}
                      aria-label="Close appointment details"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="atelier-client-hero">
                    <div className="atelier-client-identity">
                      <div className="client-avatar-circle" id="drawer-avatar-circle">
                        {(activeDrawerBooking.client_name ?? "Guest")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <h3 className="atelier-client-title" id="drawer-client-name">
                        {activeDrawerBooking.client_name ?? "Guest Appointment"}
                      </h3>
                    </div>

                    <span className={`status-seal-pill ${activeDrawerBooking.status}`}>
                      <span className="status-seal-dot" />
                      {activeDrawerBooking.status === "pending" ? "Pending Review" : activeDrawerBooking.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* 2. Unified Atelier Studio Voucher Pass (Eliminating Generic Bento Boxes) */}
                <div className={`atelier-pass-card is-status-${activeDrawerBooking.status}`}>
                  {/* Schedule Segment */}
                  <div className="atelier-pass-section">
                    <div className="atelier-pass-header-row">
                      <div className="atelier-time-hero">
                        {activeDrawerBooking.scheduled_at?.split("T")[1]?.slice(0, 5) || "12:00"}
                      </div>
                      <span className="atelier-duration-pill">
                        {activeDrawerBooking.duration_min || 45} min session
                      </span>
                    </div>
                    <div className="atelier-date-line">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>{formatEnglishDate(activeDrawerBooking.scheduled_at?.split("T")[0] || "2026-10-30")}</span>
                    </div>
                  </div>

                  {/* Perforated Deckle Tear-Line */}
                  <div className="atelier-ticket-tear">
                    <div className="atelier-ticket-dashed-line" />
                  </div>

                  {/* Service & Rate Segment */}
                  <div className="atelier-pass-section">
                    <div className="atelier-service-row">
                      <div className="atelier-service-info">
                        <div className="atelier-service-label">Treatment</div>
                        <div className="atelier-service-name" title={activeDrawerBooking.service_name || "Single Gem"}>
                          {activeDrawerBooking.service_name || "Single Gem"}
                        </div>
                      </div>
                      <div className="atelier-rate-info">
                        <div className="atelier-rate-label">Studio Rate</div>
                        <div className="atelier-price-tag">
                          {activeDrawerBooking.service_price ? `${activeDrawerBooking.service_price} kr` : "350 kr"}
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Placement Intake Badge */}
                    {customPlacement && (
                      <div className="atelier-placement-chip">
                        <span className="atelier-placement-tag">Placement</span>
                        <span className="atelier-placement-val">{customPlacement}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Client Contact Dossier Tile */}
                <div className="atelier-section-label">Client Contact</div>
                <div className="atelier-contact-card">
                  {/* Phone Row */}
                  <div className="atelier-contact-item">
                    <div className="atelier-contact-lead">
                      <span className="atelier-contact-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                      </span>
                      <span className="atelier-contact-val">
                        {activeDrawerBooking.client_phone || "No phone recorded"}
                      </span>
                    </div>
                    {activeDrawerBooking.client_phone && (
                      <div className="atelier-contact-actions">
                        <a href={`tel:${activeDrawerBooking.client_phone}`} className="atelier-action-pill atelier-pill-neutral">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          <span>Call</span>
                        </a>
                        <a
                          href={`https://wa.me/${(activeDrawerBooking.client_phone || "").replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="atelier-action-pill atelier-pill-whatsapp"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Email Row */}
                  <div className="atelier-contact-item">
                    <div className="atelier-contact-lead">
                      <span className="atelier-contact-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                      </span>
                      <span className="atelier-contact-val">
                        {activeDrawerBooking.client_email || "No email recorded"}
                      </span>
                    </div>
                    {activeDrawerBooking.client_email && (
                      <a href={`mailto:${activeDrawerBooking.client_email}`} className="atelier-action-pill atelier-pill-neutral">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                        <span>Email</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* 4. Compact Email Warning Dropdown (if delivery failed) */}
                {["bounced", "failed", "suppressed", "complained"].includes(activeDrawerBooking.email_status || "") && (
                  <details className="atelier-email-alert-accordion">
                    <summary className="atelier-email-alert-summary">
                      <div className="atelier-email-alert-lead">
                        <span className="atelier-alert-icon">⚠️</span>
                        <span className="atelier-alert-title">Confirmation email not delivered</span>
                      </div>
                      <span className="atelier-alert-chevron">▾</span>
                    </summary>
                    <div className="atelier-email-alert-body">
                      <p className="drawer-email-error" style={{ display: "block" }}>
                        {activeDrawerBooking.client_email} marked as undelivered ({activeDrawerBooking.email_error || "Mail bounced"}). Fix address & resend:
                      </p>
                      <div className="drawer-email-controls" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <input
                          type="email"
                          className="drawer-email-input"
                          defaultValue={activeDrawerBooking.client_email || ""}
                          id="drawer-resend-email-input"
                        />
                        <button
                          type="button"
                          className="btn-triage-dock btn-triage-approve"
                          style={{ height: "36px", borderRadius: "10px", width: "100%", opacity: isResendingEmail ? 0.7 : 1 }}
                          disabled={isResendingEmail}
                          onClick={async () => {
                            const emailInput = document.getElementById("drawer-resend-email-input") as HTMLInputElement;
                            const email = emailInput?.value || activeDrawerBooking.client_email;
                            setIsResendingEmail(true);
                            try {
                              const r = await fetch("/api/admin/bookings/resend", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ ref: activeDrawerBooking.ref, email, tenant_id: activeTenant }),
                              });
                              if (r.ok) {
                                showToast("✓ Confirmation email resent to " + email);
                              } else {
                                showToast("Could not resend email");
                              }
                            } catch (_) {
                              showToast("Could not resend email");
                            } finally {
                              setIsResendingEmail(false);
                            }
                          }}
                        >
                          {isResendingEmail ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                              <span className="save-spinner" />
                              Resending email…
                            </span>
                          ) : (
                            "Resend email"
                          )}
                        </button>
                      </div>
                    </div>
                  </details>
                )}

                {/* 5. Studio Remarks & Notes */}
                <div className="atelier-section-label">Studio Remarks</div>
                <div
                  className="modal-note atelier-notes-box"
                  style={{
                    fontStyle: cleanRemarks ? "normal" : "italic",
                    color: cleanRemarks ? "#111827" : "#9CA3AF",
                  }}
                >
                  {cleanRemarks ? `“${cleanRemarks}”` : "No special client requests recorded."}
                </div>

                {/* Subtle Delivered Notice (if delivered) */}
                {activeDrawerBooking.email_status === "delivered" && (
                  <div style={{ fontSize: "0.74rem", color: "#15803D", marginTop: "2px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>✓</span> Confirmation email delivered to {activeDrawerBooking.client_email}
                  </div>
                )}
              </div>

              {/* Pinned Bottom Triage Dock */}
              <div className="modal-sheet-dock">
                {activeDrawerBooking.status === "pending" ? (
                  <div className="drawer-triage-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%" }}>
                    <button
                      type="button"
                      className="btn-triage-dock btn-triage-approve"
                      disabled={triageActionRef === `${activeDrawerBooking.ref}-confirmed`}
                      style={{ opacity: triageActionRef === `${activeDrawerBooking.ref}-confirmed` ? 0.7 : 1 }}
                      onClick={async () => {
                        await handleApproveWithGuard(activeDrawerBooking.ref, activeDrawerBooking.email_status);
                        setActiveDrawerBooking(null);
                      }}
                    >
                      {triageActionRef === `${activeDrawerBooking.ref}-confirmed` ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                          <span className="save-spinner" />
                          Approving…
                        </span>
                      ) : (
                        "Approve Appointment"
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn-triage-dock btn-triage-decline"
                      disabled={triageActionRef === `${activeDrawerBooking.ref}-declined`}
                      style={{ opacity: triageActionRef === `${activeDrawerBooking.ref}-declined` ? 0.7 : 1 }}
                      onClick={async () => {
                        await handleBookingStatus(activeDrawerBooking.ref, "declined");
                        setActiveDrawerBooking(null);
                      }}
                    >
                      {triageActionRef === `${activeDrawerBooking.ref}-declined` ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                          <span className="save-spinner" />
                          Declining…
                        </span>
                      ) : (
                        "Decline"
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="drawer-triage-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%" }}>
                    <button
                      type="button"
                      className="btn-triage-dock btn-triage-reschedule"
                      onClick={() => setShowRescheduleModal(true)}
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      className="btn-triage-dock btn-triage-cancel"
                      disabled={triageActionRef === `${activeDrawerBooking.ref}-cancelled`}
                      style={{ opacity: triageActionRef === `${activeDrawerBooking.ref}-cancelled` ? 0.7 : 1 }}
                      onClick={async () => {
                        await handleBookingStatus(activeDrawerBooking.ref, "cancelled");
                        setActiveDrawerBooking(null);
                      }}
                    >
                      {triageActionRef === `${activeDrawerBooking.ref}-cancelled` ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                          <span className="save-spinner" />
                          Cancelling…
                        </span>
                      ) : (
                        "Cancel Appointment"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: New Manual Booking Modal */}
      <AnimatePresence>
        {showNewBookingModal && (
          <div
            className="modal-backdrop open"
            id="modal-new-booking"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNewBookingModal(false);
            }}
          >
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
                  setShowNewBookingModal(false);
                }
              }}
            >
              {/* Brand Watermark Backdrop Layer */}
              <div className="drawer-brand-watermark" aria-hidden="true">
                <img src={tenantProfile.logo_url || "/img/logo-v2.png"} alt="" className="drawer-brand-watermark-img" />
              </div>

              <div className="modal-top-handle" onClick={() => setShowNewBookingModal(false)} />
              <div className="modal-sheet-head">
                <div className="modal-identity">
                  <div className="client-avatar-circle" style={{ background: "var(--admin-accent, #C4A482)", color: "#121214" }}>
                    +
                  </div>
                  <div className="modal-identity-text">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span className="modal-eyebrow">NEW RESERVATION</span>
                      <span className="sheet-tenant-badge">{tenantProfile.name || "Studio"}</span>
                    </div>
                    <h3 className="modal-sheet-title">Manual Appointment</h3>
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-sheet-close"
                  onClick={() => setShowNewBookingModal(false)}
                >
                  ✕
                </button>
              </div>

              <form id="manual-booking-form" onSubmit={handleCreateManualBooking} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <div className="modal-sheet-scroll-body" style={{ paddingBottom: "16px" }}>
                  {/* 1. Treatment Selection */}
                  <div className="modal-section-title">Treatment Service</div>
                  <div className="recessed-input-group" style={{ marginBottom: "16px" }}>
                    <select
                      id="new-booking-service-select"
                      className="recessed-input"
                      value={newService}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewService(val);
                        const s = servicesList.find((srv) => srv.name === val);
                        if (s) {
                          setNewPrice(s.price_nok);
                          setNewDuration(s.duration_min);
                        }
                      }}
                      style={{ fontWeight: 600, fontSize: "0.88rem", padding: "10px 12px" }}
                    >
                      {servicesList.length > 0 ? (
                        servicesList.map((srv) => (
                          <option key={srv.id} value={srv.name}>
                            {srv.name} · {srv.price_nok} kr ({srv.duration_min} min)
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Single Gem">Single Gem · 350 kr (20 min)</option>
                          <option value="Signature Treatment">Signature Treatment · 950 kr (75 min)</option>
                          <option value="18k Gold Tooth Gem · Upper Canine">18k Gold Tooth Gem · Upper Canine · 850 kr (45 min)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* 2. Schedule: Date & Time in single cohesive row */}
                  <div className="modal-section-title">Schedule</div>
                  <div className="modal-grid-2" style={{ marginBottom: "16px" }}>
                    <div className="recessed-input-group">
                      <label className="recessed-label">Date</label>
                      <input
                        type="date"
                        className="recessed-input"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="recessed-input-group">
                      <label className="recessed-label">Time</label>
                      <EditorialTimePicker
                        id="new-booking-time"
                        value={newTime}
                        onChange={setNewTime}
                      />
                    </div>
                  </div>

                  {/* 3. Client Contact */}
                  <div className="modal-section-title">Client Details</div>
                  <div className="recessed-input-group" style={{ marginBottom: "12px" }}>
                    <label className="recessed-label">Full Name</label>
                    <input
                      type="text"
                      id="new-client-name"
                      className="recessed-input"
                      placeholder="Full client name"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="modal-grid-2" style={{ marginBottom: "16px" }}>
                    <div className="recessed-input-group">
                      <label className="recessed-label">Phone</label>
                      <input
                        type="tel"
                        id="new-client-phone"
                        className="recessed-input"
                        placeholder="+47 000 00 000"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        required
                      />
                    </div>
                    <div className="recessed-input-group">
                      <label className="recessed-label">Email (optional)</label>
                      <input
                        type="email"
                        id="new-client-email"
                        className="recessed-input"
                        placeholder="client@domain.no"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Pinned Bottom Actions */}
                <div className="modal-sheet-dock" style={{ paddingTop: "12px", borderTop: "1px solid rgba(0, 0, 0, 0.06)", display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="modal-action-btn modal-cancel-btn"
                    style={{ flex: 1, height: "46px", padding: "10px 16px", borderRadius: "9999px", background: "rgba(0, 0, 0, 0.05)", color: "#18181B", fontWeight: 700, fontSize: "0.85rem", border: "none", cursor: "pointer" }}
                    onClick={() => setShowNewBookingModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="manual-booking-submit-btn"
                    className="modal-action-btn modal-submit-btn"
                    disabled={isSubmittingBooking}
                    style={{ flex: 1, height: "46px", padding: "10px 16px", borderRadius: "9999px", background: "#111827", color: "#FFFFFF", fontWeight: 700, fontSize: "0.85rem", border: "none", cursor: "pointer", margin: 0, opacity: isSubmittingBooking ? 0.7 : 1 }}
                  >
                    {isSubmittingBooking ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                        <span className="save-spinner" aria-hidden="true" />
                        Creating…
                      </span>
                    ) : (
                      "Create Appointment"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Block Time Modal */}
      <AnimatePresence>
        {showBlockTimeModal && (
          <div className="modal-backdrop open" id="modal-timeblock">
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
                  setShowBlockTimeModal(false);
                }
              }}
            >
              {/* Brand Watermark Backdrop Layer */}
              <div className="drawer-brand-watermark" aria-hidden="true">
                <img src={tenantProfile.logo_url || "/img/logo-v2.png"} alt="" className="drawer-brand-watermark-img" />
              </div>

              <div className="modal-top-handle" onClick={() => setShowBlockTimeModal(false)} />
              <div className="modal-sheet-head">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 className="modal-sheet-title">Block Time</h3>
                  <span className="sheet-tenant-badge">{tenantProfile.name || "Studio"}</span>
                </div>
                <button
                  type="button"
                  className="modal-sheet-close"
                  onClick={() => setShowBlockTimeModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-quick-list">
                <button
                  type="button"
                  className="quick-action-btn modal-quick-row"
                  onClick={() => {
                    showToast("✓ 30 min break added");
                    setShowBlockTimeModal(false);
                  }}
                >
                  <span className="modal-quick-title">30 min break</span>
                  <span className="modal-quick-arrow">→</span>
                </button>
                <button
                  type="button"
                  className="quick-action-btn modal-quick-row"
                  onClick={() => {
                    showToast("✓ Day closed for bookings");
                    setShowBlockTimeModal(false);
                  }}
                >
                  <span className="modal-quick-title">Close the rest of the day</span>
                  <span className="modal-quick-arrow">→</span>
                </button>
              </div>

              <div className="modal-section-title">Custom break</div>
              <div className="modal-grid-2">
                <div className="recessed-input-group">
                  <label className="recessed-label">Date</label>
                  <input type="date" className="recessed-input" defaultValue={selectedDate} />
                </div>
                <div className="recessed-input-group">
                  <label className="recessed-label">Start time</label>
                  <EditorialTimePicker
                    value={blockStartTime}
                    onChange={setBlockStartTime}
                  />
                </div>
              </div>

              <button
                type="button"
                id="save-blackout-btn"
                className="modal-submit-btn modal-submit-block"
                disabled={isSubmittingBlock}
                style={{ opacity: isSubmittingBlock ? 0.7 : 1 }}
                onClick={async () => {
                  setIsSubmittingBlock(true);
                  try {
                    await new Promise((r) => setTimeout(r, 400));
                    showToast("✓ Custom block saved");
                    setShowBlockTimeModal(false);
                  } finally {
                    setIsSubmittingBlock(false);
                  }
                }}
              >
                {isSubmittingBlock ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                    <span className="save-spinner" aria-hidden="true" />
                    Saving block…
                  </span>
                ) : (
                  "Save block"
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {showRescheduleModal && activeDrawerBooking && (
          <div className="modal-backdrop open" id="modal-reschedule">
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
                  setShowRescheduleModal(false);
                }
              }}
            >
              {/* Brand Watermark Backdrop Layer */}
              <div className="drawer-brand-watermark" aria-hidden="true">
                <img src={tenantProfile.logo_url || "/img/logo-v2.png"} alt="" className="drawer-brand-watermark-img" />
              </div>

              <div className="modal-top-handle" onClick={() => setShowRescheduleModal(false)} />
              <div className="modal-sheet-head">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 className="modal-sheet-title">Reschedule Appointment</h3>
                  <span className="sheet-tenant-badge">{tenantProfile.name || "Studio"}</span>
                </div>
                <button
                  type="button"
                  className="modal-sheet-close"
                  onClick={() => setShowRescheduleModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRescheduleBooking} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <div className="modal-sheet-scroll-body" style={{ paddingBottom: "16px" }}>
                  <div className="modal-section-title">Client & Treatment</div>
                  <div className="recessed-input-group" style={{ marginBottom: "14px" }}>
                    <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#111827" }}>
                      {activeDrawerBooking.client_name}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>
                      {activeDrawerBooking.service_name || "Signature Session"} ({activeDrawerBooking.duration_min || 45}m)
                    </div>
                  </div>

                  <div className="modal-section-title">New Date & Time</div>
                  <div className="modal-grid-2">
                    <div className="recessed-input-group">
                      <label className="recessed-label">Date</label>
                      <input
                        type="date"
                        className="recessed-input"
                        value={rescheduleDate || selectedDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="recessed-input-group">
                      <label className="recessed-label">Start Time</label>
                      <EditorialTimePicker
                        value={rescheduleTime || "12:00"}
                        onChange={setRescheduleTime}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-sheet-dock" style={{ display: "flex", gap: "10px", width: "100%" }}>
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setShowRescheduleModal(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="reschedule-submit-btn"
                    className="modal-submit-btn"
                    disabled={isSubmittingReschedule}
                    style={{ flex: 2, margin: 0, opacity: isSubmittingReschedule ? 0.7 : 1 }}
                  >
                    {isSubmittingReschedule ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                        <span className="save-spinner" aria-hidden="true" />
                        Rescheduling…
                      </span>
                    ) : (
                      "Confirm Reschedule"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Custom Theme Sliding Sheet */}
      <AnimatePresence>
        {showCustomThemeSheet && (
          <div className="modal-backdrop theme-sheet-backdrop open" id="custom-theme-sheet">
            <motion.div
              className="modal-sheet theme-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.25 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 250) {
                  setShowCustomThemeSheet(false);
                }
              }}
            >
              <div className="modal-top-handle" onClick={() => setShowCustomThemeSheet(false)} />
              <div className="theme-sheet-head">
                <div>
                  <h3 className="modal-sheet-title theme-sheet-title">Customize Theme</h3>
                  <p className="theme-sheet-subtitle">Choose primary accent and surface colors</p>
                </div>
                <button
                  type="button"
                  className="modal-sheet-close theme-sheet-close"
                  onClick={() => setShowCustomThemeSheet(false)}
                >
                  ✕
                </button>
              </div>

              <div className="theme-section">
                <div className="theme-section-head">
                  <span className="theme-section-label">Primary / Accent</span>
                  <span className="theme-section-hint">Buttons, active dates, highlights</span>
                </div>
                <div className="theme-dot-grid">
                  {["#C9A876", "#A3B18A", "#E0A899", "#E4E4E7", "#3B82F6", "#2D5A27", "#C86D51", "#9D8DF1"].map(
                    (col) => (
                      <button
                        key={col}
                        type="button"
                        className="theme-dot"
                        style={{ background: col }}
                        onClick={() => setDraftCustomAccent(col)}
                      />
                    )
                  )}
                  <input
                    type="color"
                    value={draftCustomAccent}
                    onChange={(e) => setDraftCustomAccent(e.target.value)}
                    style={{ width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer" }}
                  />
                </div>
              </div>

              {/* Mini live preview */}
              <div className="theme-section">
                <div className="theme-section-head">
                  <span className="theme-section-label">Preview</span>
                </div>
                <div
                  className="theme-preview"
                  style={{
                    backgroundColor: draftCustomCanvas,
                    padding: "16px",
                    borderRadius: "14px",
                  }}
                >
                  <div
                    className="theme-preview-card"
                    style={{
                      backgroundColor: draftCustomCard,
                      padding: "14px",
                      borderRadius: "12px",
                      color: "#FFFFFF",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong>Studio Client</strong>
                        <div style={{ fontSize: "0.74rem", color: "#9CA3AF" }}>Signature Session · 60m</div>
                      </div>
                      <span
                        className="status-pill-badge confirmed"
                        style={{ backgroundColor: draftCustomAccent, color: "#121214" }}
                      >
                        CONFIRMED
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="theme-sheet-actions">
                <button
                  type="button"
                  className="theme-sheet-cancel"
                  onClick={() => setShowCustomThemeSheet(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="theme-sheet-apply"
                  onClick={() => {
                    showToast("✓ Custom theme applied");
                    setShowCustomThemeSheet(false);
                  }}
                >
                  Apply theme
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Animated Confirmation Dialog (Zero Native Chrome Popups) */}
      <AnimatePresence>
        {confirmModal && confirmModal.isOpen && (
          <div
            className="modal-backdrop open"
            style={{
              zIndex: 3500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <motion.div
              className="squircle-card"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              style={{
                maxWidth: "340px",
                width: "100%",
                padding: "22px 20px",
                background: "#FFFFFF",
                borderRadius: "22px",
                boxShadow: "0 24px 48px rgba(0, 0, 0, 0.22)",
                border: "1px solid rgba(0, 0, 0, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ fontSize: "1.35rem" }}>⚠️</span>
                <h4 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>
                  {confirmModal.title}
                </h4>
              </div>
              <p style={{ fontSize: "0.82rem", color: "#6B7280", margin: "0 0 20px", lineHeight: 1.45 }}>
                {confirmModal.message}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-triage-dock"
                  style={{ background: "rgba(0, 0, 0, 0.06)", color: "#111827" }}
                  onClick={() => setConfirmModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-triage-dock btn-triage-approve"
                  onClick={confirmModal.onConfirm}
                >
                  {confirmModal.confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification Box */}
      {toastMessage && (
        <div className="admin-toast-box show" id="admin-toast">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function AdminPortalPage() {
  return (
    <React.Suspense fallback={<div style={{ minHeight: "100dvh", background: "#121214" }} />}>
      <AdminPortalContent />
    </React.Suspense>
  );
}
