import fs from "fs";
import path from "path";

/**
 * Local tenant brand-asset resolution.
 *
 * Studio logos often use Nordic characters (for example `klø.png`) which are
 * easy to lose to URL-encoding or to an ASCII-only deployment. This module
 * resolves a configured logo URL to an actual file inside `public/img`,
 * tolerating:
 *   - URL-encoded paths (`/img/kl%C3%B8.png`)
 *   - Unicode normalization form differences (NFC vs NFD)
 *   - Nordic look-alikes (`klø.png` == `klo.png`)
 *   - Optional `logo-` prefixes (`logo-klo.png` == `klo.png`)
 */

/** Normalizes a filename into a comparison key ("klø.png" -> "klo.png"). */
export function brandFileKey(name: string): string {
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    decoded = name;
  }
  return decoded
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/å/g, "a")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]/g, "");
}

/** Decodes a path/URL and returns its basename (handles both / and \). */
export function brandFileBasename(source: string): string {
  const trimmed = (source || "").trim();
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    decoded = trimmed;
  }
  const normalized = decoded.replace(/\\/g, "/");
  return normalized.split("/").pop() || "";
}

function logoDir(): string {
  return path.join(process.cwd(), "public", "img");
}

/**
 * Generates the normalized lookup keys for a requested basename, including the
 * optional `logo-` prefix variant.
 */
function logoAliasKeys(base: string): string[] {
  const key = brandFileKey(base);
  if (!key) return [];
  const keys = new Set<string>([key]);
  if (key.startsWith("logo") && key.length > 4) {
    keys.add(key.slice(4));
  } else {
    keys.add(`logo${key}`);
  }
  return [...keys];
}

function contentTypeForFile(filename: string): string {
  switch (path.extname(filename).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "image/png";
  }
}

export interface ResolvedBrandLogo {
  /** Actual on-disk filename (e.g. "klø.png"). */
  filename: string;
  /** Absolute path to the asset. */
  absolutePath: string;
  /** Public URL path served by Next (e.g. "/img/kl%C3%B8.png"). */
  src: string;
  /** MIME type inferred from the extension. */
  contentType: string;
}

/**
 * Finds a logo file in `public/img` for the given configured URL.
 * `fallbackUrls` are tried in order when the primary does not resolve.
 * Returns `null` when no local file matches.
 */
export function resolveBrandLogo(
  logoUrl: string,
  fallbackUrls: string[] = []
): ResolvedBrandLogo | null {
  const dir = logoDir();

  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return null;
  }

  const byKey = new Map<string, string>();
  for (const entry of entries) {
    try {
      if (!fs.statSync(path.join(dir, entry)).isFile()) continue;
    } catch {
      continue;
    }
    const key = brandFileKey(entry);
    if (key && !byKey.has(key)) byKey.set(key, entry);
  }

  const candidates = [logoUrl, ...fallbackUrls].filter(Boolean);
  for (const candidate of candidates) {
    const base = brandFileBasename(candidate);
    if (!base) continue;
    for (const key of logoAliasKeys(base)) {
      const match = byKey.get(key);
      if (match) {
        return {
          filename: match,
          absolutePath: path.join(dir, match),
          src: `/img/${encodeURIComponent(match)}`,
          contentType: contentTypeForFile(match),
        };
      }
    }
  }

  return null;
}
