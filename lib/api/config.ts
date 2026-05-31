/**
 * API configuration for the Go backend.
 * Three APIs serve different roles with the same JWT secret.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const VENDOR_API_URL = process.env.NEXT_PUBLIC_VENDOR_API_URL ?? "http://localhost:8081";
const ADMIN_API_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:8082";

export type FrontendRole = "resident" | "vendor" | "manager";

export function getApiBaseUrl(role: FrontendRole | null): string {
  switch (role) {
    case "vendor":
      return VENDOR_API_URL;
    case "manager":
      return ADMIN_API_URL;
    case "resident":
    default:
      return API_URL;
  }
}

export { API_URL, VENDOR_API_URL, ADMIN_API_URL };
