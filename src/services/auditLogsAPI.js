import { apiRequest } from "./apiClient.js";

export function getAuditLogs(url = "/api/audit-logs/") {
  return apiRequest(url);
}
