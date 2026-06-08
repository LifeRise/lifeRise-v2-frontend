/**
 * API response types matching the Go backend's Laravel-compatible format.
 */

export interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface BackendProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  avatar?: string;
  timezone: string;
  status: string;
  role: 'resident' | 'vendor' | 'manager' | 'admin';
  user_type: 'customer' | 'user';
  roles: string[];
  created_at: string;
  // Optional fields for vendor profiles (may come from future backend extensions)
  ein_tax_id?: string;
  description?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
}

export interface LoginCredentials {
  email: string;
  password: string;
  supabase_access_token?: string;
}

export interface SignupData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  timezone?: string;
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

// ─── Notification Types ─────────────────────────────────────────

export interface BackendNotification {
  id: number;
  user_id: number;
  title: string;
  body: string;
  type: string;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: BackendNotification[];
  total: number;
  page: number;
  per_page: number;
}

// ─── Admin Dashboard Types ──────────────────────────────────────

export interface KPISet {
  total_complex_managers: number;
  active_customers: number;
  total_service_providers: number;
  total_bookings: number;
  total_complex_companies: number;
  total_vendor_companies: number;
}

export interface VendorBookingStatusBreakdown {
  pending: number;
  accepted: number;
  active: number;
  completed: number;
  cancelled: number;
  rejected: number;
}

export interface EventBookingStatusBreakdown {
  pending: number;
  accepted: number;
  active: number;
  cancelled: number;
  rejected: number;
}

export interface PopularService {
  service_id: number;
  service_name: string;
  booking_count: number;
}

export interface MostBookedVendor {
  vendor_id: number;
  vendor_name: string;
  company_id: number | null;
  company_name: string | null;
  booking_count: number;
}

export interface UpcomingEvent {
  event_id: number;
  title: string;
  start_at: string;
  location: string | null;
  responses: number;
}

export interface TopLocation {
  label: string;
  booking_count: number;
}

export interface DashboardOverview {
  kpis: KPISet;
  vendor_booking_stats: VendorBookingStatusBreakdown;
  event_booking_stats: EventBookingStatusBreakdown;
  popular_services: PopularService[];
  most_booked_vendors: MostBookedVendor[];
  upcoming_events: UpcomingEvent[];
  top_locations: TopLocation[];
  generated_at: string;
}
