"use client";

import { apiGet, apiPost, apiDelete } from "./client";
import { getApiBaseUrl } from "./config";

export interface Favorite {
  id: number;
  customer_id: number;
  service_id: number;
  service?: {
    id: number;
    name: string;
    price: string;
    category?: { name: string };
  };
  created_at: string;
}

export function listFavorites() {
  const baseUrl = getApiBaseUrl("resident");
  return apiGet<{ favorites: Favorite[] }>(baseUrl, "/api/favorites");
}

export function toggleFavorite(serviceId: number) {
  const baseUrl = getApiBaseUrl("resident");
  return apiPost<{ is_favorite: boolean }>(
    baseUrl,
    "/api/favorites/toggle",
    { service_id: serviceId }
  );
}

export function deleteFavorite(id: number) {
  const baseUrl = getApiBaseUrl("resident");
  return apiDelete<unknown>(baseUrl, `/api/favorites/${id}`);
}
