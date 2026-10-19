import { apiRequest } from "./apiClient.js";

export async function getReportOverview(accessToken) {
  if (!accessToken) {
    throw new Error("An access token is required to load the report overview.");
  }

  return apiRequest("/api/reports/overview/", { accessToken });
}
