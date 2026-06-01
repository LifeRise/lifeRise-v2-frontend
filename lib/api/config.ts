/**
 * API configuration for the Go backend.
 *
 * Two modes are supported:
 *  1. Single backend (default for local dev): run only `api` on port 8080.
 *     All roles (resident/vendor/manager) hit the same port.
 *  2. Three separate binaries (production): api (8080), vendor-api (8081), admin-api (8082).
 *
 * To use mode 2, set NEXT_PUBLIC_VENDOR_API_URL and NEXT_PUBLIC_ADMIN_API_URL.
 */

const CUSTOMER_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const VENDOR_API = process.env.NEXT_PUBLIC_VENDOR_API_URL ?? CUSTOMER_API;
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? CUSTOMER_API;

export type FrontendRole = "resident" | "vendor" | "manager";

export function getApiBaseUrl(role?: FrontendRole | null): string {
  switch (role) {
    case "vendor":
      return VENDOR_API;
    case "manager":
      return ADMIN_API;
    case "resident":
    default:
      return CUSTOMER_API;
  }
}

/** Login is available on all ports, but the customer API is the canonical entry point. */
export function getAuthBaseUrl(): string {
  return CUSTOMER_API;
}

export { CUSTOMER_API, VENDOR_API, ADMIN_API };
