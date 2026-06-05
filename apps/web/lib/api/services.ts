"use client";

import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import { getApiBaseUrl, type FrontendRole } from "./config";

export interface Service {
  id: number;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: string;
  currency: string;
  duration: number;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  provider_id: number;
  avg_rating?: number;
  total_reviews: number;
  status: string;
  images?: string[];
  location_type: string;
}

export interface AvailableSlot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

/** Data shape for creating/updating a service (matches backend CreateServiceRequest). */
export interface ServiceInput {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  duration: number;
  category_id?: number;
  max_participants?: number;
  location_type?: string;
}

export function listServices(role: FrontendRole = "resident") {
  const baseUrl = getApiBaseUrl(role);
  return apiGet<{ services: Service[] }>(baseUrl, "/api/services");
}

export function getService(role: FrontendRole, id: number) {
  const baseUrl = getApiBaseUrl(role);
  return apiGet<{ service: Service }>(baseUrl, `/api/services/${id}`);
}

export function getServiceSlots(role: FrontendRole, id: number) {
  const baseUrl = getApiBaseUrl(role);
  return apiGet<{ slots: AvailableSlot[] }>(baseUrl, `/api/services/${id}/slots`);
}

export function createService(role: FrontendRole, data: ServiceInput) {
  const baseUrl = getApiBaseUrl(role);
  return apiPost<{ service: Service }>(baseUrl, "/api/services", data);
}

export function updateService(role: FrontendRole, id: number, data: Partial<ServiceInput>) {
  const baseUrl = getApiBaseUrl(role);
  return apiPatch<{ service: Service }>(baseUrl, `/api/services/${id}`, data);
}

export function deleteService(role: FrontendRole, id: number) {
  const baseUrl = getApiBaseUrl(role);
  return apiDelete<unknown>(baseUrl, `/api/services/${id}`);
}
