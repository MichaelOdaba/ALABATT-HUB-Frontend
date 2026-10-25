import { apiRequest } from "./apiClient.js";

// ─── Bookings ─────────────────────────────────────────────
export function getBookings() {
  return apiRequest("/api/bookings/");
}

export function createBooking(data) {
  return apiRequest("/api/bookings/", { method: "POST", body: data });
}

export function bookingDecision(id, data) {
  return apiRequest(`/api/bookings/${id}/decision/`, { method: "POST", body: data });
}

export function cancelBooking(id) {
  return apiRequest(`/api/bookings/${id}/cancel/`, { method: "POST" });
}

// ─── Facilities ───────────────────────────────────────────
export function getFacilities() {
  return apiRequest("/api/facilities/");
}

export function createFacility(data) {
  return apiRequest("/api/facilities/", { method: "POST", body: data });
}

export function updateFacility(id, data) {
  return apiRequest(`/api/facilities/${id}/`, { method: "PUT", body: data });
}

export function deleteFacility(id) {
  return apiRequest(`/api/facilities/${id}/`, { method: "DELETE" });
}

// ─── Centres ─────────────────────────────────────────────
export function getCentres() {
  return apiRequest("/api/centres/");
}

// ─── Equipment ────────────────────────────────────────────
export function getEquipment() {
  return apiRequest("/api/equipment/");
}

export function createEquipment(data) {
  return apiRequest("/api/equipment/", { method: "POST", body: data });
}

export function updateEquipment(id, data) {
  return apiRequest(`/api/equipment/${id}/`, { method: "PUT", body: data });
}

export function deleteEquipment(id) {
  return apiRequest(`/api/equipment/${id}/`, { method: "DELETE" });
}

// ─── Equipment Loans ──────────────────────────────────────
export function getEquipmentLoans() {
  return apiRequest("/api/equipment-loans/");
}

export function createEquipmentLoan(data) {
  return apiRequest("/api/equipment-loans/", { method: "POST", body: data });
}

export function processEquipmentReturn(id, data) {
  return apiRequest(`/api/equipment-loans/${id}/return/`, { method: "POST", body: data });
}

export function updateEquipmentLoan(id, data) {
  return apiRequest(`/api/equipment-loans/${id}/`, { method: "PUT", body: data });
}
