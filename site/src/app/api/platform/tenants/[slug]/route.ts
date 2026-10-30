import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPlatformRequest, authError, isEmail, normalizeEmail } from "@/lib/platformAuth";
import { logAdminEvent } from "@/lib/audit";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic"; // design-ok

type TenantUpdate = Database["public"]["Tables"]["tenants"]["Update"];
type Bag = Record<string, unknown>;

function asRecord(value: unknown): Bag {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Bag)
    : {};
}

/** GET /api/platform/tenants/[slug] — single tenant for the editor drawer. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const auth = await verifyPlatformRequest(req);
    if (!auth.authenticated) {
      const { error, status } = authError(auth);
      return NextResponse.json({ error }, { status });
    }

    const { slug } = await params;
    const id = (slug || "").trim().toLowerCase();

    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }
    if (!tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, tenant });
  } catch (err: unknown) {
    console.error("GET platform tenant error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/**
 * PATCH /api/platform/tenants/[slug] — identity, contacts, private owner email,
 * email sender identity and active flag. Branding is merged through the RPC.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const auth = await verifyPlatformRequest(req);
    if (!auth.authenticated || !auth.email) {
      const { error, status } = authError(auth);
      return NextResponse.json({ error }, { status });
    }

    const { slug } = await params;
    const id = (slug || "").trim().toLowerCase();
    const body = (await req.json().catch(() => ({}))) as Bag;

    const { data: existing, error: readError } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    const update: TenantUpdate = { updated_at: new Date().toISOString() };
    const changed: string[] = [];

    const setString = (field: keyof TenantUpdate, limit = 200, nullable = true) => {
      if (!(field in body)) return;
      const raw = body[field as string];
      const value = typeof raw === "string" ? raw.trim() : "";
      if (!value && !nullable) return;
      (update as Bag)[field as string] = value ? value.slice(0, limit) : null;
      changed.push(field as string);
    };

    if ("name" in body) {
      const value = String(body.name || "").trim();
      if (!value) return NextResponse.json({ error: "name_required" }, { status: 400 });
      update.name = value.slice(0, 120);
      changed.push("name");
    }

    const ownerEmail = normalizeEmail(body.owner_email ?? body.ownerEmail);
    if (ownerEmail) {
      if (!isEmail(ownerEmail)) {
        return NextResponse.json({ error: "invalid_owner_email" }, { status: 400 });
      }
      update.owner_email = ownerEmail;
      changed.push("owner_email");
    }

    const contactEmail = normalizeEmail(body.contact_email ?? body.contactEmail);
    if (contactEmail) {
      if (!isEmail(contactEmail)) {
        return NextResponse.json({ error: "invalid_contact_email" }, { status: 400 });
      }
      update.contact_email = contactEmail;
      changed.push("contact_email");
    }

    setString("phone", 40);
    setString("whatsapp", 40);
    setString("address", 300);
    setString("org_number", 40);
    setString("mva_status", 40);
    setString("hours_text", 300);
    setString("from_name", 80);

    const replyTo = normalizeEmail(body.reply_to);
    if (replyTo) {
      if (!isEmail(replyTo)) {
        return NextResponse.json({ error: "invalid_reply_to" }, { status: 400 });
      }
      update.reply_to = replyTo;
      changed.push("reply_to");
    }

    if ("timezone" in body) {
      const timezone = String(body.timezone || "").trim();
      if (!timezone) return NextResponse.json({ error: "invalid_timezone" }, { status: 400 });
      update.timezone = timezone;
      changed.push("timezone");
    }

    if ("currency" in body) {
      const currency = String(body.currency || "").trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) {
        return NextResponse.json({ error: "invalid_currency" }, { status: 400 });
      }
      update.currency = currency;
      changed.push("currency");
    }

    if ("ref_prefix" in body) {
      const refPrefix = String(body.ref_prefix || "").trim().toUpperCase();
      if (!/^[A-Z]{2,4}$/.test(refPrefix)) {
        return NextResponse.json({ error: "invalid_ref_prefix" }, { status: 400 });
      }
      update.ref_prefix = refPrefix;
      changed.push("ref_prefix");
    }

    if ("active" in body) {
      update.active = Boolean(body.active);
      changed.push("active");
    }

    let tenant = existing;
    if (changed.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("tenants")
        .update(update)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      tenant = data;
    }

    const branding = asRecord(body.branding);
    if (Object.keys(branding).length > 0) {
      const { error } = await supabaseAdmin.rpc("set_tenant_branding", {
        p_tenant_id: id,
        p_branding: branding as never,
        p_actor: auth.email,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      changed.push("branding");
    }

    if (changed.includes("branding") && supabaseAdmin) {
      const { data: refreshed } = await supabaseAdmin
        .from("tenants")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (refreshed) tenant = refreshed;
    }

    if (ownerEmail) {
      await supabaseAdmin.from("tenant_admins").upsert(
        { tenant_id: id, email: ownerEmail, role: "owner", active: true },
        { onConflict: "tenant_id,email" }
      );
    }

    if (changed.length === 0) {
      return NextResponse.json({ error: "no_fields" }, { status: 400 });
    }

    await logAdminEvent({
      actor: auth.email,
      tenantId: id,
      action: "tenant.update",
      detail: { fields: changed },
    });

    return NextResponse.json({ success: true, tenant, changed });
  } catch (err: unknown) {
    console.error("PATCH platform tenant error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
