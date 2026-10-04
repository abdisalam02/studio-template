import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/** True only when we have both a valid http(s) URL and a non-empty key. */
function hasUsableCredentials(key: string): boolean {
  if (!supabaseUrl || !key) return false;
  try {
    const parsed = new URL(supabaseUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function logDisabledClient(scope: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[supabase] ${scope} client disabled: ${message}`);
}

/**
 * Public (anon) client. Resolves to null — never throws — when the optional
 * environment variables are missing or malformed (e.g. during a clean build).
 */
export const supabase = (() => {
  if (!hasUsableCredentials(supabaseAnonKey)) return null;
  try {
    return createClient<Database>(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    logDisabledClient("anon", error);
    return null;
  }
})();

/**
 * Service-role client. Resolves to null — never throws — when the optional
 * environment variables are missing or malformed.
 */
export const supabaseAdmin = (() => {
  if (!hasUsableCredentials(supabaseServiceRoleKey)) return null;
  try {
    return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (error) {
    logDisabledClient("service-role", error);
    return null;
  }
})();
