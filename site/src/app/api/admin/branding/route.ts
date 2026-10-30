import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { isTenantAdmin } from "@/lib/tenantAuth";

export const dynamic = "force-dynamic"; // design-ok

const HEX = /^#[0-9a-fA-F]{6}$/;
const FONT = /^[a-zA-Z0-9 ,\-'"]{1,80}$/;
const PALETTE_KEYS = ["accent", "card", "canvas"] as const;
const TYPOGRAPHY_KEYS = ["heading", "body"] as const;

type Bag = Record<string, unknown>;

function asRecord(value: unknown): Bag {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Bag)
    : {};
}

/**
 * Tenant-scoped branding update.
 *
 * Accepts a palette, typography pair, tagline and monogram. Nested objects are
 * merged into the current branding so a partial save never wipes the rest.
 * Platform super-admins may target any tenant.
 */
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const auth = await verifyAdminRequest(req);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Bag;
    const tenantId = String(body.tenant_id || auth.tenantId || "").trim().toLowerCase();
    if (!tenantId) {
      return NextResponse.json({ error: "tenant_required" }, { status: 400 });
    }
    if (!(await isTenantAdmin(auth.email, tenantId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { data: tenant, error: readError } = await supabaseAdmin
      .from("tenants")
      .select("id, branding")
      .eq("id", tenantId)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }
    if (!tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    const current = asRecord(tenant.branding);
    const patch: Bag = {};

    if (body.palette !== undefined) {
      const input = asRecord(body.palette);
      const palette: Bag = { ...asRecord(current.palette) };
      for (const key of PALETTE_KEYS) {
        if (!(key in input)) continue;
        const value = String(input[key] || "").trim();
        if (!HEX.test(value)) {
          return NextResponse.json(
            { error: "invalid_palette", message: `${key} must be a #RRGGBB hex colour.` },
            { status: 400 }
          );
        }
        palette[key] = value.toUpperCase();
      }
      patch.palette = palette;
    }

    if (body.typography !== undefined) {
      const input = asRecord(body.typography);
      const typography: Bag = { ...asRecord(current.typography) };
      for (const key of TYPOGRAPHY_KEYS) {
        if (!(key in input)) continue;
        const value = String(input[key] || "").trim();
        if (!FONT.test(value)) {
          return NextResponse.json({ error: "invalid_typography" }, { status: 400 });
        }
        typography[key] = value;
      }
      patch.typography = typography;
    }

    if (body.tagline !== undefined) {
      const tagline = String(body.tagline || "").trim();
      if (tagline.length > 120) {
        return NextResponse.json({ error: "tagline_too_long" }, { status: 400 });
      }
      patch.tagline = tagline;
    }

    if (body.monogram !== undefined) {
      const monogram = String(body.monogram || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 3);
      // An empty value clears the custom monogram and restores initials.
      patch.monogram = monogram;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "no_fields" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc("set_tenant_branding", {
      p_tenant_id: tenantId,
      p_branding: patch as never,
      p_actor: auth.email,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tenant_id: tenantId, branding: data });
  } catch (err: unknown) {
    console.error("POST admin branding error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
