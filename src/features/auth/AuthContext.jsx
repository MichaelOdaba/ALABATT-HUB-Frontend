import { useEffect, useState } from "react";
import {
  getCurrentUser,
  loginRequest,
  registerRequest,
} from "../../services/authAPI.js";
import {
  clearSessionTokens,
  readSessionTokens,
  saveSessionTokens,
  SESSION_EXPIRED_EVENT,
} from "../../services/sessionStore.js";
import { AuthContext } from "./authContext.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const handleSessionExpired = () => {
      if (isMounted) {
        setUser(null);
        setIsLoading(false);
      }
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    async function restoreSession() {
      const tokens = readSessionTokens();
      if (!tokens.access && !tokens.refresh) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        clearSessionTokens();
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      isMounted = false;
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, []);

  async function login(credentials) {
    const session = await loginRequest(credentials);
    if (!session?.access || !session?.refresh || !session?.user) {
      throw new Error("The login response was missing session data.");
    }

    saveSessionTokens({ access: session.access, refresh: session.refresh });
    setUser(session.user);
    return session.user;
  }

  async function register(details) {
    return registerRequest(details);
  }

  function logout() {
    clearSessionTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
