import {
  clearSessionTokens,
  notifySessionExpired,
  readSessionTokens,
  saveSessionTokens,
} from "./sessionStore.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
let refreshRequest;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function buildUrl(path) {
  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(data, status) {
  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (typeof data === "string" && data) {
    return data;
  }

  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      const message = Array.isArray(value) ? value[0] : value;
      if (typeof message === "string") {
        return message;
      }
    }
  }

  return `Request failed (${status}).`;
}

async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      const { refresh } = readSessionTokens();
      if (!refresh) {
        clearSessionTokens();
        notifySessionExpired();
        return null;
      }

      try {
        const response = await fetch(buildUrl("/api/auth/token/refresh/"), {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh }),
        });
        const data = await readResponse(response);

        if (!response.ok || !data?.access) {
          throw new Error("Token refresh failed.");
        }

        saveSessionTokens({
          access: data.access,
          refresh: data.refresh ?? refresh,
        });
        return data.access;
      } catch {
        clearSessionTokens();
        notifySessionExpired();
        return null;
      }
    })().finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

async function sendRequest(
  path,
  { method, body, headers, signal, accessToken },
) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  const requestOptions = { method, headers: requestHeaders, signal };
  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
    requestOptions.body = JSON.stringify(body);
  }
  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(buildUrl(path), requestOptions);
}

export async function apiRequest(
  path,
  {
    method = "GET",
    body,
    headers,
    signal,
    authenticated = true,
    retryOnUnauthorized = true,
    accessToken,
  } = {},
) {
  const initialToken = authenticated
    ? (accessToken ?? readSessionTokens().access)
    : null;
  const requestOptions = { method, body, headers, signal };
  let response = await sendRequest(path, {
    ...requestOptions,
    accessToken: initialToken,
  });

  if (response.status === 401 && authenticated && retryOnUnauthorized) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      response = await sendRequest(path, {
        ...requestOptions,
        accessToken: refreshedToken,
      });
    }
  }

  const data = await readResponse(response);
  if (!response.ok) {
    throw new ApiError(
      errorMessage(data, response.status),
      response.status,
      data,
    );
  }

  return data;
}
