'use client';

import { apiGet, apiPost, apiPatch } from './client';
import { getApiBaseUrl, type FrontendRole } from './config';

export interface Booking {
  id: number;
  booking_number: string;
  customer_id: number;
  service_provider_id: number;
  service_id: number;
  status: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  price: string;
  final_price: string;
  currency: string;
  notes?: string;
  payment_status: string;
  created_at: string;
  service_name?: string;
  customer_name?: string;
  customer_avatar?: string;
  provider_name?: string;
  provider_avatar?: string;
  address?: string;
}

export interface CreateBookingData {
  service_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  notes?: string;
}

export function listBookings(role: FrontendRole = 'resident') {
  const baseUrl = getApiBaseUrl(role);
  return apiGet<{ bookings: Booking[] }>(baseUrl, '/api/bookings');
}

export function getBooking(role: FrontendRole, id: number) {
  const baseUrl = getApiBaseUrl(role);
  return apiGet<{ booking: Booking }>(baseUrl, `/api/bookings/${id}`);
}

export function createBooking(role: FrontendRole = 'resident', data: CreateBookingData) {
  const baseUrl = getApiBaseUrl(role);
  return apiPost<{ booking: Booking }>(baseUrl, '/api/bookings', data);
}

export function updateBookingStatus(role: FrontendRole, id: number, status: string) {
  const baseUrl = getApiBaseUrl(role);
  return apiPatch<{ booking: Booking }>(baseUrl, `/api/bookings/${id}/status`, { status });
}

export function rescheduleBooking(
  role: FrontendRole,
  id: number,
  data: {
    booking_date: string;
    start_time: string;
    end_time: string;
    reason?: string;
  }
) {
  const baseUrl = getApiBaseUrl(role);
  return apiPost<{ booking: Booking }>(baseUrl, `/api/bookings/${id}/reschedule`, data);
}
