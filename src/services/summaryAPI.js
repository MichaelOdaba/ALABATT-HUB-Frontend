import { apiRequest } from "./apiClient.js";

export function getReportOverview() {
  return apiRequest("/api/reports/overview/");
}
