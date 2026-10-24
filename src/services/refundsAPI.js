import { apiRequest } from "./apiClient.js";

export function getRefunds() {
  return apiRequest("/api/refunds/");
}

export function updateRefund(id, status) {
  return apiRequest(`/api/refunds/${id}/`, { method: "PUT", body: { status } });
}
