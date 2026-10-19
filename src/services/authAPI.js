import { apiRequest } from "./apiClient.js";

export function loginRequest({ username, password }) {
  return apiRequest("/api/auth/login/", {
    method: "POST",
    body: { username, password },
    authenticated: false,
  });
}

export function registerRequest(details) {
  return apiRequest("/api/auth/register/", {
    method: "POST",
    body: details,
    authenticated: false,
  });
}

export function getCurrentUser() {
  return apiRequest("/api/auth/me/");
}
