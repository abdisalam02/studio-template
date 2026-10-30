export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "expired"
  | "completed"
  | "no_show";

export interface Database {
  public: {
    Tables: {
      admin_sessions: {
        Row: {
          id: string;
          token_hash: string;
          email: string;
          tenant_id: string | null;
          scope: string;
          created_at: string;
          expires_at: string;
          revoked_at: string | null;
          last_seen_at: string | null;
        };
        Insert: {
          id?: string;
          token_hash: string;
          email: string;
          tenant_id?: string | null;
          scope?: string;
          created_at?: string;
          expires_at: string;
          revoked_at?: string | null;
          last_seen_at?: string | null;
        };
        Update: {
          scope?: string;
          expires_at?: string;
          revoked_at?: string | null;
          last_seen_at?: string | null;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: {
          email: string;
          name: string | null;
          role: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          email: string;
          name?: string | null;
          role?: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string | null;
          role?: string;
          active?: boolean;
        };
        Relationships: [];
      };
      admin_otp_challenges: {
        Row: {
          id: string;
          email: string;
          code_hash: string;
          expires_at: string;
          attempts: number;
          consumed_at: string | null;
          created_at: string;
          ip_hash: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          code_hash: string;
          expires_at: string;
          attempts?: number;
          consumed_at?: string | null;
          created_at?: string;
          ip_hash?: string | null;
        };
        Update: {
          attempts?: number;
          consumed_at?: string | null;
        };
        Relationships: [];
      };
      auth_rate_events: {
        Row: {
          id: number;
          key: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          key: string;
          created_at?: string;
        };
        Update: {
          key?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_events: {
        Row: {
          id: number;
          actor_email: string;
          tenant_id: string;
          action: string;
          booking_ref: string | null;
          detail: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          actor_email: string;
          tenant_id: string;
          action: string;
          booking_ref?: string | null;
          detail?: Json;
          created_at?: string;
        };
        Update: {
          action?: string;
          booking_ref?: string | null;
          detail?: Json;
        };
        Relationships: [];
      };
      tenant_admins: {
        Row: {
          tenant_id: string;
          email: string;
          role: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          tenant_id: string;
          email: string;
          role?: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          role?: string;
          active?: boolean;
        };
        Relationships: [];
      };
      tenant_domains: {
        Row: {
          domain: string;
          tenant_id: string;
          created_at: string;
        };
        Insert: {
          domain: string;
          tenant_id: string;
          created_at?: string;
        };
        Update: {
          domain?: string;
          tenant_id?: string;
        };
        Relationships: [];
      };
      tenants: {
        Row: {
          id: string;
          name: string;
          owner_email: string;
          contact_email: string | null;
          phone: string | null;
          whatsapp: string | null;
          address: string | null;
          org_number: string | null;
          mva_status: string | null;
          hours_text: string | null;
          currency: string;
          logo_url: string | null;
          hero_image_url: string | null;
          watermark_url: string | null;
          favicon_url: string | null;
          branding: Json;
          from_name: string | null;
          reply_to: string | null;
          profile: Json | null;
          ref_prefix: string;
          timezone: string;
          allowed_origins: Json;
          buffer_min: number;
          slot_step_min: number;
          min_notice_min: number;
          max_days_ahead: number;
          pending_hold_min: number;
          active: boolean;
          created_at: number;
        };
        Insert: {
          id: string;
          name: string;
          owner_email: string;
          contact_email?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          address?: string | null;
          org_number?: string | null;
          mva_status?: string | null;
          hours_text?: string | null;
          currency?: string;
          logo_url?: string | null;
          hero_image_url?: string | null;
          watermark_url?: string | null;
          favicon_url?: string | null;
          branding?: Json;
          from_name?: string | null;
          reply_to?: string | null;
          profile?: Json | null;
          ref_prefix?: string;
          timezone?: string;
          allowed_origins?: Json;
          buffer_min?: number;
          slot_step_min?: number;
          min_notice_min?: number;
          max_days_ahead?: number;
          pending_hold_min?: number;
          active?: boolean;
          created_at?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_email?: string;
          contact_email?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          address?: string | null;
          org_number?: string | null;
          mva_status?: string | null;
          hours_text?: string | null;
          currency?: string;
          logo_url?: string | null;
          hero_image_url?: string | null;
          watermark_url?: string | null;
          favicon_url?: string | null;
          branding?: Json;
          from_name?: string | null;
          reply_to?: string | null;
          profile?: Json | null;
          ref_prefix?: string;
          timezone?: string;
          allowed_origins?: Json;
          buffer_min?: number;
          slot_step_min?: number;
          min_notice_min?: number;
          max_days_ahead?: number;
          pending_hold_min?: number;
          active?: boolean;
          created_at?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: number;
          tenant_id: string;
          name: string;
          duration_min: number;
          price_nok: number;
          buffer_min: number | null;
          active: boolean;
          sort: number;
        };
        Insert: {
          id?: never;
          tenant_id: string;
          name: string;
          duration_min: number;
          price_nok: number;
          buffer_min?: number | null;
          active?: boolean;
          sort?: number;
        };
        Update: {
          id?: never;
          tenant_id?: string;
          name?: string;
          duration_min?: number;
          price_nok?: number;
          buffer_min?: number | null;
          active?: boolean;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      hours: {
        Row: {
          tenant_id: string;
          weekday: number;
          open_min: number;
          close_min: number;
        };
        Insert: {
          tenant_id: string;
          weekday: number;
          open_min: number;
          close_min: number;
        };
        Update: {
          tenant_id?: string;
          weekday?: number;
          open_min?: number;
          close_min?: number;
        };
        Relationships: [
          {
            foreignKeyName: "hours_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      blackouts: {
        Row: {
          id: number;
          tenant_id: string;
          start_utc: number;
          end_utc: number;
          reason: string | null;
        };
        Insert: {
          id?: never;
          tenant_id: string;
          start_utc: number;
          end_utc: number;
          reason?: string | null;
        };
        Update: {
          id?: never;
          tenant_id?: string;
          start_utc?: number;
          end_utc?: number;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "blackouts_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      bookings: {
        Row: {
          id: number;
          ref: string;
          tenant_id: string;
          service_id: number;
          start_utc: number;
          end_utc: number;
          block_end_utc: number;
          status: BookingStatus;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          notes: string | null;
          price_nok: number;
          deposit_nok: number;
          consent_at: number;
          privacy_version: string;
          action_token_hash: string;
          manage_token_hash: string;
          created_at: number;
          expires_at: number | null;
          decided_at: number | null;
          resend_email_id: string | null;
          customer_email_status: string | null;
          customer_email_status_at: number | null;
          customer_email_error: string | null;
          reminder_24h_sent_at: number | null;
          reminder_2h_sent_at: number | null;
        };
        Insert: {
          id?: never;
          ref: string;
          tenant_id: string;
          service_id: number;
          start_utc: number;
          end_utc: number;
          block_end_utc: number;
          status?: BookingStatus;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          notes?: string | null;
          price_nok: number;
          deposit_nok?: number;
          consent_at: number;
          privacy_version: string;
          action_token_hash: string;
          manage_token_hash: string;
          created_at?: number;
          expires_at?: number | null;
          decided_at?: number | null;
          resend_email_id?: string | null;
          customer_email_status?: string | null;
          customer_email_status_at?: number | null;
          customer_email_error?: string | null;
          reminder_24h_sent_at?: number | null;
          reminder_2h_sent_at?: number | null;
        };
        Update: {
          id?: never;
          ref?: string;
          tenant_id?: string;
          service_id?: number;
          start_utc?: number;
          end_utc?: number;
          block_end_utc?: number;
          status?: BookingStatus;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string;
          notes?: string | null;
          price_nok?: number;
          deposit_nok?: number;
          consent_at?: number;
          privacy_version?: string;
          action_token_hash?: string;
          manage_token_hash?: string;
          created_at?: number;
          expires_at?: number | null;
          decided_at?: number | null;
          resend_email_id?: string | null;
          customer_email_status?: string | null;
          customer_email_status_at?: number | null;
          customer_email_error?: string | null;
          reminder_24h_sent_at?: number | null;
          reminder_2h_sent_at?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      provision_tenant: {
        Args: {
          payload: Json;
        };
        Returns: Json;
      };
      set_tenant_branding: {
        Args: {
          p_tenant_id: string;
          p_branding: Json;
          p_actor?: string;
        };
        Returns: Json;
      };
      create_booking_atomic: {
        Args: {
          p_ref: string;
          p_tenant_id: string;
          p_service_id: number | null;
          p_start_utc: number;
          p_end_utc: number;
          p_block_end_utc: number;
          p_status: string;
          p_customer_name: string;
          p_customer_email: string;
          p_customer_phone: string;
          p_notes: string | null;
          p_price_nok: number;
          p_deposit_nok: number;
          p_consent_at: number;
          p_privacy_version: string;
          p_action_token_hash: string;
          p_manage_token_hash: string;
          p_now: number;
          p_expires_at: number | null;
          p_service_ids?: Json;
          p_service_summary?: string | null;
          p_custom_fields?: Json;
        };
        Returns: boolean;
      };
      reschedule_booking_atomic: {
        Args: {
          p_booking_id: number;
          p_start_utc: number;
          p_end_utc: number;
          p_block_end_utc: number;
          p_now: number;
        };
        Returns: boolean;
      };
      consume_rate_limit: {
        Args: {
          p_key: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      verify_otp_challenge: {
        Args: {
          p_id: string;
          p_email: string;
          p_code_hash: string;
        };
        Returns: boolean;
      };
      purge_admin_events: {
        Args: {
          p_older_than_days?: number;
        };
        Returns: number;
      };
      anonymize_old_bookings: {
        Args: {
          p_older_than_days: number;
          p_tenant_id?: string | null;
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
