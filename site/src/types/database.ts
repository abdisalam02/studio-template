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
      tenants: {
        Row: {
          id: string;
          name: string;
          owner_email: string;
          phone: string | null;
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
          phone?: string | null;
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
          phone?: string | null;
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
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
