import { apiRequest } from "./apiClient.js";

export function getNotifications() {
  return apiRequest("/api/notifications/");
}

export function createNotification(data) {
  return apiRequest("/api/notifications/", { method: "POST", body: data });
}

export function updateNotification(id, data) {
  return apiRequest(`/api/notifications/${id}/`, { method: "PUT", body: data });
}

export function markNotificationRead(id) {
  return apiRequest(`/api/notifications/${id}/`, { method: "PATCH", body: { is_read: true } });
}

export function deleteNotification(id) {
  return apiRequest(`/api/notifications/${id}/`, { method: "DELETE" });
}
