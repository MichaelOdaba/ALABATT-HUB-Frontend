const ACCESS_TOKEN_KEY = "alabatt.accessToken";
const REFRESH_TOKEN_KEY = "alabatt.refreshToken";
export const SESSION_EXPIRED_EVENT = "alabatt:session-expired";

function getStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readSessionTokens() {
  const storage = getStorage();
  if (!storage) {
    return { access: null, refresh: null };
  }

  return {
    access: storage.getItem(ACCESS_TOKEN_KEY),
    refresh: storage.getItem(REFRESH_TOKEN_KEY),
  };
}

export function saveSessionTokens({ access, refresh }) {
  const storage = getStorage();
  if (!storage) {
    throw new Error("Session storage is unavailable in this browser.");
  }

  storage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) {
    storage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
}

export function clearSessionTokens() {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
}

export function notifySessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}
