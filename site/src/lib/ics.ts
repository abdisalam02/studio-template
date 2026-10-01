interface IcsParams {
  ref: string;
  title: string;
  description: string;
  startUtc: number;
  endUtc: number;
  location?: string;
  tenantName: string;
}

function formatIcsDate(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function generateIcsCalendar(params: {
  ref: string;
  title: string;
  description: string;
  startUtc: number;
  endUtc: number;
  location?: string;
  tenantName: string;
}): string {
  const nowUtc = Math.floor(Date.now() / 1000);
  const dtStamp = formatIcsDate(nowUtc);
  const dtStart = formatIcsDate(params.startUtc);
  const dtEnd = formatIcsDate(params.endUtc);
  const uid = `${params.ref}@studio-booking`;
  const summary = escapeIcsText(params.title);
  const description = escapeIcsText(params.description);
  const location = params.location ? escapeIcsText(params.location) : escapeIcsText(params.tenantName);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Studio Booking//NONSGML v1.0//NO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n") + "\r\n";
}
