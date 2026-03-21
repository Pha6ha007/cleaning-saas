// dubai-control/src/api/client-types.ts
// All API type definitions — split from client.ts for maintainability
// This file contains only types and interfaces — no runtime code.

export interface ManagerJobSummary {
  id: number;
  status: string;

  scheduled_date?: string;
  start_time?: string;
  end_time?: string;

  location_name?: string;
  location_address?: string;
  cleaner_name?: string;

  has_proof?: boolean;

  // алиасы под старый UI (все строки)
  location?: string;
  address?: string;
  cleaner?: string;

  [key: string]: any;
}

// ---------- Usage summary (trial + soft-limits) ----------

export type PlanTier = "standard" | "pro" | "enterprise";

export type UsageSummary = {
  plan: string;
  plan_tier: PlanTier;
  is_paid: boolean;
  is_trial_active: boolean;
  is_trial_expired: boolean;
  days_left: number | null;
  jobs_today_count: number;
  jobs_today_soft_limit: number;
  cleaners_count: number;
  cleaners_soft_limit: number;
};

// ---------- Timeline types ----------

export type JobTimelineStepKey =
  | "scheduled"
  | "check_in"
  | "before_photo"
  | "checklist"
  | "after_photo"
  | "check_out";

export type JobTimelineStepStatus = "done" | "pending";

export interface JobTimelineStep {
  key: JobTimelineStepKey;
  label: string;
  status: JobTimelineStepStatus;
  timestamp?: string | null;
}

// ---------- Check events ----------

export interface ManagerJobCheckEvent {
  id: number;
  event_type: "check_in" | "check_out" | string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
}

export interface ManagerJobDetail extends ManagerJobSummary {
  photos?:
    | {
        before?:
          | {
              id: number;
              type: string;
              url: string;
              uploaded_at?: string;
            }
          | null;
        after?:
          | {
              id: number;
              type: string;
              url: string;
              uploaded_at?: string;
            }
          | null;
      }
    | null;
  check_events?: ManagerJobCheckEvent[];
  notes?: string | null;

  // нормализованный таймлайн для UI
  timeline?: JobTimelineStep[];

  checklist?: { item: string; completed: boolean }[];

  sla_status?: "ok" | "violated";
  sla_reasons?: string[];

  // force-complete метаданные
  force_completed?: boolean;
  force_completed_at?: string | null;
  force_completed_by?: {
    id: number;
    full_name: string;
  } | null;
}

// История отправки PDF-отчёта по джобу
export interface ManagerJobReportEmailLogEntry {
  id: number;
  sent_at: string;
  target_email: string | null;
  status: "sent" | "failed" | string;
  sent_by: string | null;
  subject: string | null;
  error_message: string | null;
}

export interface ManagerJobReportEmailsResponse {
  job_id: number;
  emails: ManagerJobReportEmailLogEntry[];
}

// ---------- Company, Cleaners & Locations types ----------

export interface CompanyProfile {
  id: number;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
}

export interface Cleaner {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
}

export interface CleanerAuditLog {
  action: string;
  action_code: "cleaner_created" | "password_reset" | "status_changed";
  performed_by: string;
  performed_by_email: string | null;
  created_at: string;
  metadata?: {
    new_status?: boolean;
  } | null;
}

// единственный тип Location для всего фронта
export interface Location {
  id: number;
  name: string;
  address: string | null;

  // флаг активности локации (используется в Manager Portal)
  is_active?: boolean;

  // возможные поля, которые уже были в UI/бэке
  latitude?: number | null;
  longitude?: number | null;

  created_at?: string | null; // backend
  createdAt?: string | null; // старый фронт

  [key: string]: any;
}

// ---------- Maintenance Context: Categories ----------

export interface MaintenanceCategory {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
}

// ---------- Maintenance Context: Assets ----------

export interface AssetType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  // Stage 9: Default checklist for assets of this type
  default_checklist_template?: {
    id: number;
    name: string;
  } | null;
}

export interface Asset {
  id: number;
  name: string;
  serial_number: string;
  description: string;
  is_active: boolean;
  location: {
    id: number;
    name: string;
  };
  asset_type: {
    id: number;
    name: string;
    // Stage 9: Default checklist for auto-apply in CreateVisit
    default_checklist_template?: {
      id: number;
      name: string;
    } | null;
  };
  created_at: string;
  updated_at: string;
}

// ---------- Auth state ----------