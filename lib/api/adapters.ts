"use client";

/**
 * Adapters that transform backend API data into frontend-compatible shapes.
 * This preserves the existing UI while we gradually migrate to real data.
 */

import type { Service as BackendService } from "./services";
import type { Booking as BackendBooking } from "./bookings";
import type { Vendor, ServiceDetail, ResidentBooking } from "@/lib/types";

const gradients = [
  "from-emerald-600 to-teal-900",
  "from-amber-700 to-red-950",
  "from-blue-600 to-indigo-900",
  "from-rose-600 to-pink-900",
  "from-violet-600 to-purple-900",
  "from-cyan-600 to-blue-900",
];

function getGradient(id: number): string {
  return gradients[id % gradients.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatPrice(price: string | number, currency = "USD"): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(num);
}

export function adaptServiceToVendor(s: BackendService): Vendor {
  const name = s.name || "Unnamed Service";
  const category = s.category?.name || "General";

  return {
    id: String(s.id),
    name,
    specialty: category,
    category,
    rating: s.avg_rating ?? 5.0,
    reviews: s.total_reviews ?? 0,
    price: formatPrice(s.price, s.currency),
    available: s.status === "active",
    initials: getInitials(name),
    gradient: getGradient(s.id),
    badge: s.status === "active" ? "Verified" : null,
  };
}

export function adaptServiceToDetail(s: BackendService): ServiceDetail {
  const vendor = adaptServiceToVendor(s);
  return {
    ...vendor,
    description: s.description || `${s.name} professional service.`,
    tags: [vendor.category, "Professional", "Home Service"],
    portfolio: s.images && Array.isArray(s.images) ? s.images : [],
    estimatedDuration: `${s.duration} min`,
    cancellationPolicy: "24 hours",
  };
}

export function adaptBookingToResidentBooking(b: BackendBooking): ResidentBooking {
  const statusMap: Record<string, ResidentBooking["status"]> = {
    Current: "confirmed",
    Pending: "pending",
    Confirmed: "confirmed",
    Completed: "completed",
    Cancelled: "cancelled",
    Rejected: "cancelled",
  };

  return {
    id: String(b.id),
    vendor: `Provider #${b.service_provider_id}`,
    service: `Service #${b.service_id}`,
    date: b.booking_date,
    time: b.start_time,
    status: statusMap[b.status] || "pending",
    amount: formatPrice(b.final_price, b.currency),
    avatar: "S",
  };
}
