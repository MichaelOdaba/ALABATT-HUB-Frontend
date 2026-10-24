import { apiRequest } from "./apiClient.js";

export function getPayments() {
  return apiRequest("/api/payments/");
}

export function getBookings() {
  return apiRequest("/api/bookings/");
}

export function getFacilities() {
  return apiRequest("/api/facilities/");
}
