export interface AvailabilityTenant {
  timezone: string;
  slot_step_min: number;
  buffer_min: number;
  min_notice_min: number;
}

export interface AvailabilityService {
  duration_min: number;
  buffer_min?: number | null;
}

export interface AvailabilityHour {
  weekday: number; // 0 = Monday, ..., 6 = Sunday
  open_min: number; // Minutes from 00:00 (0..1439)
  close_min: number; // Minutes from 00:00 (1..1440)
}

export interface AvailabilityBlackout {
  start_utc: number; // Epoch seconds
  end_utc: number; // Epoch seconds
}

export interface AvailabilityBooking {
  start_utc: number; // Epoch seconds
  block_end_utc: number; // Epoch seconds
}

export interface AvailabilityParams {
  tenant: AvailabilityTenant;
  service: AvailabilityService;
  hours: AvailabilityHour[];
  blackouts: AvailabilityBlackout[];
  bookings: AvailabilityBooking[];
  range: {
    fromUtc: number; // Epoch seconds (inclusive start of range)
    toUtc: number; // Epoch seconds (exclusive end of range)
  };
  nowUtc?: number; // Optional override for testing (default: Date.now() / 1000)
}

/**
 * Parses a YYYY-MM-DD string into [year, month, day]
 */
function parseDateParts(dateStr: string): [number, number, number] {
  const parts = dateStr.split("-").map(Number);
  return [parts[0], parts[1], parts[2]];
}

/**
 * Returns epoch seconds for a specific calendar date and minute-of-day in a given IANA timezone.
 */
function localDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  minuteOfDay: number,
  timeZone: string
): number {
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;

  // Approximate guess assuming UTC
  let guessMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);

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

  // Iteratively converge to handle DST shifts
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(guessMs));
    const p: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        p[part.type] = Number(part.value);
      }
    }

    const localMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second || 0);
    const targetMs = Date.UTC(year, month - 1, day, hours, minutes, 0);
    const diff = targetMs - localMs;

    if (diff === 0) break;
    guessMs += diff;
  }

  return Math.floor(guessMs / 1000);
}

/**
 * Formats epoch seconds to an ISO date string (YYYY-MM-DD) in the specified timezone.
 */
function getLocalDateString(epochSeconds: number, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(epochSeconds * 1000));
}

/**
 * Computes Monday=0, ..., Sunday=6 for a given YYYY-MM-DD in tenant timezone.
 */
function getWeekdayMondayZero(year: number, month: number, day: number): number {
  // Using UTC to determine standard day of week
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday, 1 = Monday...
  return (jsDay + 6) % 7; // Convert so Monday = 0, Sunday = 6
}

export function computeAvailability(params: AvailabilityParams): string[] {
  const { tenant, service, hours, blackouts, bookings, range } = params;
  const now = params.nowUtc ?? Math.floor(Date.now() / 1000);
  const minNoticeSeconds = tenant.min_notice_min * 60;
  const minEarliestStart = now + minNoticeSeconds;
  const effectiveBufferSec = (service.buffer_min ?? tenant.buffer_min) * 60;
  const serviceDurationSec = service.duration_min * 60;
  const slotStepSec = Math.max(1, tenant.slot_step_min) * 60;

  // Determine local date bounds in tenant's timezone
  const startDateStr = getLocalDateString(range.fromUtc, tenant.timezone);
  const endDateStr = getLocalDateString(range.toUtc, tenant.timezone);

  const [startYear, startMonth, startDay] = parseDateParts(startDateStr);
  const [endYear, endMonth, endDay] = parseDateParts(endDateStr);

  const startUtcMidnight = Date.UTC(startYear, startMonth - 1, startDay);
  const endUtcMidnight = Date.UTC(endYear, endMonth - 1, endDay);

  const validSlotStarts: number[] = [];

  // Iterate day by day from start date to end date (inclusive)
  const MS_PER_DAY = 86400000;
  for (let currentMs = startUtcMidnight; currentMs <= endUtcMidnight; currentMs += MS_PER_DAY) {
    const curDate = new Date(currentMs);
    const y = curDate.getUTCFullYear();
    const m = curDate.getUTCMonth() + 1;
    const d = curDate.getUTCDate();

    const weekday = getWeekdayMondayZero(y, m, d);

    // Get all shift windows for this weekday
    const dayShifts = hours.filter((h) => h.weekday === weekday);
    if (!dayShifts.length) continue;

    for (const shift of dayShifts) {
      const shiftCloseUtc = localDateTimeToUtc(y, m, d, shift.close_min, tenant.timezone);

      // Step through slots from open_min up to close_min
      for (let slotMin = shift.open_min; slotMin < shift.close_min; slotMin += tenant.slot_step_min) {
        const startUtc = localDateTimeToUtc(y, m, d, slotMin, tenant.timezone);

        // Filter out slots strictly outside of range [fromUtc, toUtc)
        if (startUtc < range.fromUtc || startUtc >= range.toUtc) {
          continue;
        }

        // Validate 1: Must not start before now + min_notice
        if (startUtc < minEarliestStart) {
          continue;
        }

        const endUtc = startUtc + serviceDurationSec;
        const blockEndUtc = endUtc + effectiveBufferSec;

        // Validate 2: end_utc + buffer must finish before or at shift close time
        if (blockEndUtc > shiftCloseUtc) {
          continue;
        }

        // Validate 3: Overlap check with blackouts [start_utc, end_utc]
        // Overlap condition: start < blackout.end_utc && block_end_utc > blackout.start_utc
        const hasBlackoutConflict = blackouts.some(
          (b) => startUtc < b.end_utc && blockEndUtc > b.start_utc
        );
        if (hasBlackoutConflict) {
          continue;
        }

        // Validate 4: Overlap check with existing blocking bookings [start_utc, block_end_utc]
        const hasBookingConflict = bookings.some(
          (b) => startUtc < b.block_end_utc && blockEndUtc > b.start_utc
        );
        if (hasBookingConflict) {
          continue;
        }

        validSlotStarts.push(startUtc);
      }
    }
  }

  // Deduplicate and sort
  const uniqueStarts = Array.from(new Set(validSlotStarts)).sort((a, b) => a - b);

  // Return as ISO 8601 UTC strings
  return uniqueStarts.map((epoch) => new Date(epoch * 1000).toISOString());
}
