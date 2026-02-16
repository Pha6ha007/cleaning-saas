// =============================================================================
// Customer Portal API Layer (Stage 16)
// =============================================================================
// Read-only API for customers to view their assets, visits, and contracts.
// All data is scoped to locations assigned to the customer.
// =============================================================================

import { apiClient } from "./client";

// =============================================================================
// Types
// =============================================================================

export interface CustomerDashboard {
  total_assets: number;
  upcoming_visits: number;
  recent_completions: number;
  active_contracts: number;
  locations_count: number;
}

export interface CustomerLocation {
  id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export interface CustomerAsset {
  id: number;
  name: string;
  serial_number: string;
  description: string;
  location: {
    id: number;
    name: string;
  };
  asset_type: {
    id: number;
    name: string;
  } | null;
  warranty_status: string;
  warranty_end_date: string | null;
}

export interface CustomerAssetDetail extends CustomerAsset {
  location: {
    id: number;
    name: string;
    address: string;
  };
  warranty_start_date: string | null;
  warranty_provider: string;
  warranty_notes: string;
  created_at: string;
}

export interface CustomerVisit {
  id: number;
  scheduled_date: string | null;
  status: string;
  status_display: string;
  location: {
    id: number;
    name: string;
  };
  asset: {
    id: number;
    name: string;
  } | null;
  technician: {
    id: number;
    name: string;
  } | null;
  completed_at: string | null;
  has_photos: boolean;
}

export interface CustomerVisitDetail {
  id: number;
  scheduled_date: string | null;
  status: string;
  status_display: string;
  location: {
    id: number;
    name: string;
    address: string;
  };
  asset: {
    id: number;
    name: string;
    serial_number: string;
  } | null;
  category: {
    id: number;
    name: string;
  } | null;
  technician: {
    id: number;
    name: string;
  } | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  completed_at: string | null;
  photo_before: string | null;
  photo_after: string | null;
  manager_notes: string;
  checklist: Array<{
    id: number;
    text: string;
    is_required: boolean;
    is_completed: boolean;
  }>;
  checklist_progress: {
    total: number;
    completed: number;
  };
}

export interface CustomerContract {
  id: number;
  name: string;
  contract_type: string;
  contract_type_display: string;
  status: string;
  status_display: string;
  location: {
    id: number;
    name: string;
  };
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export interface CustomerContractDetail extends CustomerContract {
  description: string;
  location: {
    id: number;
    name: string;
    address: string;
  };
  terms: string;
  created_at: string;
}

export interface CustomerProfile {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  company: {
    id: number;
    name: string;
  };
  locations: Array<{ id: number; name: string }>;
  locations_count: number;
}

// Filters
export interface CustomerVisitFilters {
  status?: string;
  asset_id?: number;
  location_id?: number;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get customer dashboard summary.
 * GET /api/customer/dashboard/
 */
export async function getCustomerDashboard(): Promise<CustomerDashboard> {
  const res = await apiClient.get<CustomerDashboard>("/api/customer/dashboard/");
  return res.data;
}

/**
 * Get customer profile.
 * GET /api/customer/profile/
 */
export async function getCustomerProfile(): Promise<CustomerProfile> {
  const res = await apiClient.get<CustomerProfile>("/api/customer/profile/");
  return res.data;
}

/**
 * Get customer's locations.
 * GET /api/customer/locations/
 */
export async function getCustomerLocations(): Promise<CustomerLocation[]> {
  const res = await apiClient.get<CustomerLocation[]>("/api/customer/locations/");
  return res.data;
}

/**
 * Get customer's assets.
 * GET /api/customer/assets/
 */
export async function getCustomerAssets(filters?: { location_id?: number }): Promise<CustomerAsset[]> {
  const params = new URLSearchParams();
  if (filters?.location_id) {
    params.set("location_id", String(filters.location_id));
  }
  const query = params.toString();
  const url = query ? `/api/customer/assets/?${query}` : "/api/customer/assets/";
  const res = await apiClient.get<CustomerAsset[]>(url);
  return res.data;
}

/**
 * Get single asset detail.
 * GET /api/customer/assets/{id}/
 */
export async function getCustomerAsset(id: number): Promise<CustomerAssetDetail> {
  const res = await apiClient.get<CustomerAssetDetail>(`/api/customer/assets/${id}/`);
  return res.data;
}

/**
 * Get customer's visits.
 * GET /api/customer/visits/
 */
export async function getCustomerVisits(filters?: CustomerVisitFilters): Promise<CustomerVisit[]> {
  const params = new URLSearchParams();
  if (filters?.status) {
    params.set("status", filters.status);
  }
  if (filters?.asset_id) {
    params.set("asset_id", String(filters.asset_id));
  }
  if (filters?.location_id) {
    params.set("location_id", String(filters.location_id));
  }
  const query = params.toString();
  const url = query ? `/api/customer/visits/?${query}` : "/api/customer/visits/";
  const res = await apiClient.get<CustomerVisit[]>(url);
  return res.data;
}

/**
 * Get single visit detail.
 * GET /api/customer/visits/{id}/
 */
export async function getCustomerVisit(id: number): Promise<CustomerVisitDetail> {
  const res = await apiClient.get<CustomerVisitDetail>(`/api/customer/visits/${id}/`);
  return res.data;
}

/**
 * Get customer's contracts.
 * GET /api/customer/contracts/
 */
export async function getCustomerContracts(): Promise<CustomerContract[]> {
  const res = await apiClient.get<CustomerContract[]>("/api/customer/contracts/");
  return res.data;
}

/**
 * Get single contract detail.
 * GET /api/customer/contracts/{id}/
 */
export async function getCustomerContract(id: number): Promise<CustomerContractDetail> {
  const res = await apiClient.get<CustomerContractDetail>(`/api/customer/contracts/${id}/`);
  return res.data;
}

// =============================================================================
// Query Keys for React Query
// =============================================================================

export const customerKeys = {
  dashboard: ["customer", "dashboard"] as const,
  profile: ["customer", "profile"] as const,
  locations: ["customer", "locations"] as const,
  assets: {
    all: ["customer", "assets"] as const,
    list: (filters?: { location_id?: number }) => [...customerKeys.assets.all, "list", filters] as const,
    detail: (id: number) => [...customerKeys.assets.all, "detail", id] as const,
  },
  visits: {
    all: ["customer", "visits"] as const,
    list: (filters?: CustomerVisitFilters) => [...customerKeys.visits.all, "list", filters] as const,
    detail: (id: number) => [...customerKeys.visits.all, "detail", id] as const,
  },
  contracts: {
    all: ["customer", "contracts"] as const,
    list: () => [...customerKeys.contracts.all, "list"] as const,
    detail: (id: number) => [...customerKeys.contracts.all, "detail", id] as const,
  },
} as const;
