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
  role: "resident" | "vendor" | "manager";
  user_type: "customer" | "user";
  roles: string[];
  created_at: string;
  // Optional fields for vendor profiles (may come from future backend extensions)
  ein_tax_id?: string;
  description?: string;
  approval_status?: "pending" | "approved" | "rejected";
}

export interface LoginCredentials {
  email: string;
  password: string;
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
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}
