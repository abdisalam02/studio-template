import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const isDev = process.env.NODE_ENV === "development";
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";
    const allowBypass = Boolean(
      isDev && (
        req.nextUrl.searchParams.get("dev_bypass") === "true" ||
        (token && token.startsWith("dev-bypass-")) ||
        isDev
      )
    );

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ error: "unauthorized", message: "Ugyldig eller utløpt økt." }, { status: 401 });
    }
    const userEmail = auth.email;
    const body = await req.json();
    const { start_utc, end_utc, reason } = body;

    if (typeof start_utc !== "number" || typeof end_utc !== "number" || end_utc <= start_utc) {
      return NextResponse.json(
        { error: "invalid_payload", message: "start_utc og end_utc må være gyldige tidsstempler (end_utc > start_utc)." },
        { status: 400 }
      );
    }

    let tenantId = "gangina";
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("owner_email", userEmail)
      .eq("active", true)
      .maybeSingle();

    if (tenant?.id) {
      tenantId = tenant.id;
    } else {
      const isAllowedAdmin = [
        "niwache12@gmail.com",
        "ganginabeauty@gmail.com",
        "admin@agure.space",
        "support@agure.space",
      ].includes(userEmail.toLowerCase());
      if (!isAllowedAdmin && !allowBypass) {
        return NextResponse.json({ error: "forbidden", message: "Ingen salong tilknyttet denne e-posten." }, { status: 403 });
      }
    }

    const { data: blackout, error: insertErr } = await supabaseAdmin
      .from("blackouts")
      .insert({
        tenant_id: tenantId,
        start_utc,
        end_utc,
        reason: reason ? String(reason).trim() : null,
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: "database_error", details: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, blackout }, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating blackout:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const isDev = process.env.NODE_ENV === "development";
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";
    const allowBypass = Boolean(
      isDev && (
        req.nextUrl.searchParams.get("dev_bypass") === "true" ||
        (token && token.startsWith("dev-bypass-")) ||
        isDev
      )
    );

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ error: "unauthorized", message: "Ugyldig eller utløpt økt." }, { status: 401 });
    }
    const userEmail = auth.email;
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json({ error: "missing_id", message: "id er påkrevd." }, { status: 400 });
    }

    const blackoutId = Number(idParam);
    const { data: blackout, error: fetchErr } = await supabaseAdmin
      .from("blackouts")
      .select("*, tenants(owner_email)")
      .eq("id", blackoutId)
      .single();

    if (fetchErr || !blackout) {
      return NextResponse.json({ error: "blackout_not_found" }, { status: 404 });
    }

    const ownerEmail = (blackout.tenants as unknown as { owner_email: string } | null)?.owner_email;
    const isAllowedAdmin = [
      "niwache12@gmail.com",
      "ganginabeauty@gmail.com",
      "admin@agure.space",
      "support@agure.space",
    ].includes(userEmail.toLowerCase());
    const isOwner = Boolean(ownerEmail && ownerEmail.toLowerCase() === userEmail.toLowerCase());
    if (!allowBypass && !isOwner && !isAllowedAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { error: deleteErr } = await supabaseAdmin
      .from("blackouts")
      .delete()
      .eq("id", blackoutId);

    if (deleteErr) {
      return NextResponse.json({ error: "database_error", details: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("Error deleting blackout:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}
