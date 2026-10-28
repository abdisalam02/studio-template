import { supabaseAdmin } from "@/lib/supabase";

export interface AdminEventInput {
  actor: string;
  tenantId: string;
  action: string;
  bookingRef?: string | null;
  detail?: Record<string, unknown>;
}

/**
 * Append-only admin activity log. Failures never break the mutation itself.
 */
export async function logAdminEvent(input: AdminEventInput): Promise<void> {
  if (!supabaseAdmin || !input.actor || !input.tenantId) return;

  try {
    await supabaseAdmin.from("admin_events").insert({
      actor_email: input.actor.toLowerCase().trim(),
      tenant_id: input.tenantId,
      action: input.action,
      booking_ref: input.bookingRef || null,
      detail: (input.detail || {}) as never,
    });
  } catch (err) {
    console.error("Failed to write admin audit event:", err);
  }
}
