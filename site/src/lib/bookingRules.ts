/**
 * Shared booking rules.
 *
 * The availability endpoint and the booking endpoints must agree on what a
 * valid slot is; otherwise a forged request can book a time the calendar
 * would never show (past, too soon, too far ahead, off the slot grid).
 */

export type SlotRuleError =
  | "invalid"
  | "past"
  | "lead_time"
  | "horizon"
  | "closed"
  | "outside_hours"
  | "off_step";

export interface SlotRules {
  timezone: string;
  minNoticeMin: number;
  maxDaysAhead: number;
  slotStepMin: number;
}

export interface Shift {
  open_min: number;
  close_min: number;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** Monday = 0 … Sunday = 6 (matches the `hours` table). */
  weekday: number;
}

/** Calendar parts of an epoch-second timestamp in a specific IANA timezone. */
export function zonedParts(epochSeconds: number, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });

  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(new Date(epochSeconds * 1000))) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    // Some engines render midnight as 24 with h24; normalise defensively.
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    weekday: WEEKDAYS.indexOf(map.weekday as (typeof WEEKDAYS)[number]),
  };
}

/**
 * Interprets "YYYY-MM-DD" + "HH:mm" as a wall-clock time in `timeZone` and
 * returns epoch seconds. Iterates to converge across DST boundaries.
 */
export function zonedDateTimeToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string
): number | null {
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour > 23 || minute > 59) return null;

  const target = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = target;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });

  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(guess));
    const values: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== "literal") values[part.type] = Number(part.value);
    }
    const localAsUtc = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second || 0
    );
    const diff = target - localAsUtc;
    if (diff === 0) break;
    guess += diff;
  }

  return Math.floor(guess / 1000);
}

/**
 * Returns the first rule the slot violates, or null when it is bookable.
 * `shift` is the opening window for that local weekday (null = closed).
 */
export function validateSlot(params: {
  startUtc: number;
  durationMin: number;
  nowUtc: number;
  rules: SlotRules;
  shift: Shift | null;
}): SlotRuleError | null {
  const { startUtc, durationMin, nowUtc, rules, shift } = params;

  if (!Number.isFinite(startUtc) || startUtc <= 0) return "invalid";
  if (startUtc < nowUtc) return "past";

  const leadSeconds = Math.max(0, rules.minNoticeMin) * 60;
  if (startUtc < nowUtc + leadSeconds) return "lead_time";

  const horizonSeconds = Math.max(1, rules.maxDaysAhead) * 86400;
  if (startUtc > nowUtc + horizonSeconds) return "horizon";

  if (!shift) return "closed";

  const local = zonedParts(startUtc, rules.timezone);
  const localMinutes = local.hour * 60 + local.minute;

  if (localMinutes < shift.open_min) return "outside_hours";
  if (localMinutes + Math.max(1, durationMin) > shift.close_min) return "outside_hours";

  const step = Math.max(1, rules.slotStepMin);
  if ((localMinutes - shift.open_min) % step !== 0) return "off_step";

  return null;
}

/** Human-readable message for API responses. */
export function slotErrorMessage(error: SlotRuleError, rules: SlotRules): string {
  switch (error) {
    case "past":
      return "That time has already passed.";
    case "lead_time":
      return `Bookings must be made at least ${rules.minNoticeMin} minutes in advance.`;
    case "horizon":
      return `Bookings can only be made up to ${rules.maxDaysAhead} days ahead.`;
    case "closed":
      return "The studio is closed on that day.";
    case "outside_hours":
      return "That time falls outside the studio's opening hours.";
    case "off_step":
      return "That time is not one of the available slots.";
    default:
      return "That time is not available.";
  }
}

