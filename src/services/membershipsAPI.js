import { apiRequest } from "./apiClient.js";

export function getMemberships() {
  return apiRequest("/api/memberships/");
}

export function getMembershipTypes() {
  return apiRequest("/api/membership-types/");
}
