import { apiRequest } from "./apiClient.js";

// ─── Membership Types (Plans) ───────────────────────────────────────────────

export function getMembershipTypes() {
  return apiRequest("/api/membership-types/");
}

export function createMembershipType(data) {
  return apiRequest("/api/membership-types/", { method: "POST", body: data });
}

export function updateMembershipType(id, data) {
  return apiRequest(`/api/membership-types/${id}/`, {
    method: "PUT",
    body: data,
  });
}

export function deleteMembershipType(id) {
  return apiRequest(`/api/membership-types/${id}/`, { method: "DELETE" });
}

// ─── Memberships ─────────────────────────────────────────────────────────────

export function getMemberships() {
  return apiRequest("/api/memberships/");
}

export function createMembership(data) {
  return apiRequest("/api/memberships/", { method: "POST", body: data });
}

export function updateMembership(id, data) {
  return apiRequest(`/api/memberships/${id}/`, { method: "PUT", body: data });
}
