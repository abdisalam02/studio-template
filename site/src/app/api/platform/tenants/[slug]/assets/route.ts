import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPlatformRequest, authError, PLATFORM_TENANT_BUCKET } from "@/lib/platformAuth";
import { logAdminEvent } from "@/lib/audit";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic"; // design-ok
export const runtime = "nodejs";

type TenantUpdate = Database["public"]["Tables"]["tenants"]["Update"];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_SVG_BYTES = 500 * 1024;

const KIND_COLUMNS = {
  logo: "logo_url",
  favicon: "favicon_url",
  watermark: "watermark_url",
  hero: "hero_image_url",
} as const;

type AssetKind = keyof typeof KIND_COLUMNS;

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const DANGEROUS_SVG =
  /<\s*(script|foreignObject|iframe|object|embed|handler|listener)\b|\son[a-z]+\s*=|javascript\s*:/i;

/**
 * Removes executable content from an SVG. Anything that still matches after
 * stripping is rejected instead of uploaded.
 */
function sanitizeSvg(input: string): string | null {
  if (/<!ENTITY/i.test(input)) return null;

  let svg = input.replace(/^\uFEFF/, "");
  for (const tag of ["script", "foreignObject", "iframe", "object", "embed", "handler", "listener", "set"]) {
    const paired = new RegExp(`<\\s*${tag}\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*${tag}\\s*>`, "gi");
    const single = new RegExp(`<\\s*${tag}\\b[^>]*\\/?>`, "gi");
    svg = svg.replace(paired, "").replace(single, "");
  }
  svg = svg.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  svg = svg.replace(
    /\s(?:href|xlink:href)\s*=\s*(?:"|')?\s*(?:javascript|vbscript|data:text\/html)[^"'\s>]*(?:"|')?/gi,
    ""
  );
  svg = svg.replace(/javascript\s*:/gi, "");

  if (DANGEROUS_SVG.test(svg)) return null;
  if (!/<svg[\s>]/i.test(svg)) return null;
  return svg.trim();
}

function matchesSignature(ext: string, bytes: Uint8Array, text: string): boolean {
  switch (ext) {
    case "png":
      return (
        bytes.length > 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
      );
    case "jpg":
    case "jpeg":
      return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "webp":
      return (
        bytes.length > 12 &&
        String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
      );
    case "svg":
      return /<svg[\s>]/i.test(text);
    default:
      return false;
  }
}

function objectPathFromUrl(url: string): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${PLATFORM_TENANT_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}

/** POST /api/platform/tenants/[slug]/assets — multipart logo/favicon/watermark/hero. */
export async function POST(
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
    const tenantId = (slug || "").trim().toLowerCase();

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "invalid_form" }, { status: 400 });
    }

    const kind = String(form.get("kind") || "").trim().toLowerCase() as AssetKind;
    if (!(kind in KIND_COLUMNS)) {
      return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }

    const originalExt = (file.name.split(".").pop() || "").toLowerCase();
    const ext = MIME_BY_EXT[originalExt] ? (originalExt === "jpeg" ? "jpg" : originalExt) : "";
    if (!ext) {
      return NextResponse.json(
        { error: "unsupported_type", message: "Use PNG, JPG, WebP or SVG." },
        { status: 400 }
      );
    }
    if (file.type && EXT_BY_MIME[file.type] && EXT_BY_MIME[file.type] !== ext) {
      return NextResponse.json({ error: "type_mismatch" }, { status: 400 });
    }

    const limit = ext === "svg" ? MAX_SVG_BYTES : MAX_IMAGE_BYTES;
    if (file.size > limit) {
      return NextResponse.json(
        { error: "file_too_large", message: ext === "svg" ? "SVG limit is 500 KB." : "Image limit is 5 MB." },
        { status: 413 }
      );
    }

    const originalBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(originalBuffer);
    const text = ext === "svg" ? new TextDecoder("utf-8").decode(bytes) : "";

    if (!matchesSignature(ext, bytes, text)) {
      return NextResponse.json({ error: "invalid_file" }, { status: 400 });
    }

    let uploadBuffer: ArrayBuffer = originalBuffer;
    if (ext === "svg") {
      const cleaned = sanitizeSvg(text);
      if (!cleaned) {
        return NextResponse.json(
          { error: "unsafe_svg", message: "SVG contains disallowed script or event content." },
          { status: 400 }
        );
      }
      const encoded = new TextEncoder().encode(cleaned);
      uploadBuffer = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer;
    }

    if (uploadBuffer.byteLength > limit) {
      return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }

    const hash = crypto
      .createHash("sha256")
      .update(Buffer.from(uploadBuffer))
      .digest("hex")
      .slice(0, 12);
    const filename = `${Date.now()}-${hash}.${ext}`;
    const path = `${tenantId}/${kind}/${filename}`;
    const contentType = MIME_BY_EXT[ext];

    const { error: uploadError } = await supabaseAdmin.storage
      .from(PLATFORM_TENANT_BUCKET)
      .upload(path, uploadBuffer, { contentType, upsert: false, cacheControl: "31536000" });

    if (uploadError) {
      console.error("Asset upload failed:", uploadError);
      return NextResponse.json({ error: "upload_failed", message: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(PLATFORM_TENANT_BUCKET)
      .getPublicUrl(path);
    const publicUrl = publicUrlData.publicUrl;

    const column = KIND_COLUMNS[kind];
    const previousUrl = String((tenant as Record<string, unknown>)[column] || "");

    const update: TenantUpdate = { updated_at: new Date().toISOString() };
    (update as Record<string, unknown>)[column] = publicUrl;
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("tenants")
      .update(update)
      .eq("id", tenantId)
      .select()
      .single();

    if (updateError) {
      await supabaseAdmin.storage.from(PLATFORM_TENANT_BUCKET).remove([path]);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const previousPath = objectPathFromUrl(previousUrl);
    if (previousPath && previousPath !== path && previousPath.startsWith(`${tenantId}/${kind}/`)) {
      const { error: removeError } = await supabaseAdmin.storage
        .from(PLATFORM_TENANT_BUCKET)
        .remove([previousPath]);
      if (removeError) {
        console.warn("Previous asset cleanup failed:", removeError.message);
      }
    }

    await logAdminEvent({
      actor: auth.email,
      tenantId,
      action: "asset.upload",
      detail: { kind, path, bytes: uploadBuffer.byteLength },
    });

    return NextResponse.json({
      success: true,
      tenant_id: tenantId,
      kind,
      url: publicUrl,
      tenant: updated,
    });
  } catch (err: unknown) {
    console.error("POST platform asset error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
