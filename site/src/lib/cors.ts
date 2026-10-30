/**
 * CORS origin resolution.
 *
 * Order: configured env list -> database tenant domains -> tenants.allowed_origins.
 * No customer domain is compiled into middleware.
 */

const DEV_PORTS = new Set(["3000", "3001", "3002", "4000", "5173"]);
const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const CACHE_TTL_MS = 60_000;

const originCache = new Map<string, number>();

export function configuredOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isLocalhostDevOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (!LOCALHOST_HOSTS.has(url.hostname.toLowerCase())) return false;
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    return DEV_PORTS.has(port);
  } catch {
    return false;
  }
}

function supabaseEndpoint(): { base: string; key: string } | null {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";
  if (!base || !key) return null;
  return { base, key };
}

async function databaseAllowsOrigin(origin: string, hostname: string): Promise<boolean> {
  const endpoint = supabaseEndpoint();
  if (!endpoint) return false;

  const headers = {
    apikey: endpoint.key,
    Authorization: `Bearer ${endpoint.key}`,
    Accept: "application/json",
  };

  try {
    const domainUrl =
      `${endpoint.base}/rest/v1/tenant_domains` +
      `?domain=eq.${encodeURIComponent(hostname)}&select=tenant_id&limit=1`;
    const domainRes = await fetch(domainUrl, { headers, cache: "no-store" });
    if (domainRes.ok) {
      const rows = (await domainRes.json()) as Array<{ tenant_id?: string }>;
      if (Array.isArray(rows) && rows.length > 0) return true;
    }

    const tenantsUrl =
      `${endpoint.base}/rest/v1/tenants` +
      `?active=eq.true&select=id,allowed_origins`;
    const tenantsRes = await fetch(tenantsUrl, { headers, cache: "no-store" });
    if (!tenantsRes.ok) return false;
    const tenants = (await tenantsRes.json()) as Array<{ allowed_origins?: unknown }>;
    return tenants.some((tenant) => {
      const list = Array.isArray(tenant.allowed_origins)
        ? tenant.allowed_origins
        : typeof tenant.allowed_origins === "string"
          ? safeParse(tenant.allowed_origins)
          : [];
      return list.includes(origin);
    });
  } catch {
    return false;
  }
}

function safeParse(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Returns true when the origin is allowed by env or by a tenant record. */
export async function isAllowedOrigin(origin: string): Promise<boolean> {
  if (!origin || origin === "null") return false;
  if (configuredOrigins().includes(origin)) return true;
  if (isLocalhostDevOrigin(origin)) return true;

  const cached = originCache.get(origin);
  if (cached && cached > Date.now()) return true;

  let hostname = "";
  try {
    hostname = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }

  const allowed = await databaseAllowsOrigin(origin, hostname);
  if (allowed) originCache.set(origin, Date.now() + CACHE_TTL_MS);
  return allowed;
}

