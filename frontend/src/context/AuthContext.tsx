import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { fetchCurrentUser, loginUser } from "../api/authApi";
import type { AuthUser } from "../api/authApi";
import { isProductOwnerUser, normalizeAuthRole } from "../utils/authAccess";

interface LoginResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthReady: boolean;
  login: (companyCode: string, username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  canAccessMain: (id: string) => boolean;
  canAccessScreen: (id: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const TOKEN_STORAGE_KEY = "otm_token";
const USER_STORAGE_KEY = "otm_user";
const LAST_ACTIVITY_STORAGE_KEY = "otm_last_activity_at";
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = ["click", "keydown", "mousedown", "mousemove", "scroll", "touchstart"];
const FULL_ACCESS_ROLES = new Set(["productowner", "superadmin"]);

const getStoredToken = (): string => localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY) || "";

const hasFullAccess = (authUser: AuthUser | null): boolean => {
  if (!authUser) return false;
  return isProductOwnerUser(authUser) || FULL_ACCESS_ROLES.has(normalizeAuthRole(authUser.role));
};

const getStoredLastActivity = (): number => {
  const raw = localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY) || sessionStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const storeUser = (user: AuthUser): void => {
  const serializedUser = JSON.stringify(user);
  sessionStorage.setItem(USER_STORAGE_KEY, serializedUser);
  localStorage.setItem(USER_STORAGE_KEY, serializedUser);
};

const storeToken = (token: string): void => {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

const storeLastActivity = (timestamp: string): void => {
  sessionStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, timestamp);
  localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, timestamp);
};

const getLoginPath = (): string => {
  const base = import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL.replace(/\/+$/, "");
  return `${base}/login`;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const inactivityTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const clearStoredAuth = (): void => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
  };

  const clearInactivityTimer = (): void => {
    if (inactivityTimerRef.current !== null) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  const logout = (): void => {
    clearInactivityTimer();
    clearStoredAuth();
    setUser(null);
    setIsAuthReady(true);
    const loginPath = getLoginPath();
    if (window.location.pathname !== loginPath) {
      window.location.href = loginPath;
    }
  };

  const updateLastActivity = (): void => {
    storeLastActivity(String(Date.now()));
  };

  const scheduleAutoLogout = (): void => {
    clearInactivityTimer();

    const lastActivity = getStoredLastActivity();
    if (!lastActivity) {
      logout();
      return;
    }

    const remainingMs = SESSION_TIMEOUT_MS - (Date.now() - lastActivity);

    if (remainingMs <= 0) {
      logout();
      return;
    }

    inactivityTimerRef.current = window.setTimeout(() => {
      logout();
    }, remainingMs);
  };

  useEffect(() => {
    const token = getStoredToken();
    const lastActivity = getStoredLastActivity();

    if (!token || !lastActivity || Date.now() - lastActivity >= SESSION_TIMEOUT_MS) {
      logout();
      return;
    }

    fetchCurrentUser(token)
      .then((data) => {
        if (!data.user) {
          logout();
          return;
        }
        storeUser(data.user);
        updateLastActivity();
        setUser(data.user);
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        setIsAuthReady(true);
      });
  }, []);

  const login = async (companyCode: string, username: string, password: string): Promise<LoginResult> => {
    try {
      const data = await loginUser(companyCode, username, password);
      if (!data.user) {
        return { success: false, message: "Login failed. User details were not returned." };
      }

      const accessToken = (data.access_token || "").trim();
      if (!accessToken) {
        return { success: false, message: "Login failed. Access token was not returned." };
      }

      storeToken(accessToken);
      storeUser(data.user);
      updateLastActivity();
      setUser(data.user);
      setIsAuthReady(true);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Login failed. Check credentials.",
      };
    }
  };

  useEffect(() => {
    if (!user || user.menus?.length) {
      return;
    }

    const token = getStoredToken();
    if (!token) {
      return;
    }

    let active = true;
    fetchCurrentUser(token)
      .then((data) => {
        if (!active || !data.user) {
          return;
        }
        storeUser(data.user);
        updateLastActivity();
        setUser(data.user);
      })
      .catch(() => {
        // Keep the current session; normal API interceptors handle expired tokens.
      });

    return () => {
      active = false;
    };
  }, [user?.unique_id, user?.menus?.length]);

  useEffect(() => {
    if (!user) {
      clearInactivityTimer();
      sessionStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
      return;
    }

    if (!getStoredLastActivity()) {
      updateLastActivity();
    }

    const handleActivity = (): void => {
      updateLastActivity();
      scheduleAutoLogout();
    };

    const handleVisibilityChange = (): void => {
      if (!document.hidden) {
        scheduleAutoLogout();
      }
    };

    const handleStorage = (event: StorageEvent): void => {
      if (event.key && ![TOKEN_STORAGE_KEY, USER_STORAGE_KEY, LAST_ACTIVITY_STORAGE_KEY].includes(event.key)) {
        return;
      }

      const sharedToken = getStoredToken();
      const sharedLastActivity = getStoredLastActivity();

      if (!sharedToken || !sharedLastActivity || Date.now() - sharedLastActivity >= SESSION_TIMEOUT_MS) {
        logout();
        return;
      }

      const sharedUserRaw = localStorage.getItem(USER_STORAGE_KEY);
      if (sharedUserRaw) {
        try {
          const nextUser = JSON.parse(sharedUserRaw) as AuthUser;
          setUser(nextUser);
          sessionStorage.setItem(USER_STORAGE_KEY, sharedUserRaw);
        } catch {
          // Ignore malformed shared user data and keep current state.
        }
      }

      sessionStorage.setItem(TOKEN_STORAGE_KEY, sharedToken);
      storeLastActivity(String(sharedLastActivity));
      scheduleAutoLogout();
    };

    scheduleAutoLogout();

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInactivityTimer();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [user]);

  const canAccessMain = (id: string): boolean => hasFullAccess(user) || (user?.main_screens?.includes(id) ?? false);
  const canAccessScreen = (id: string): boolean => hasFullAccess(user) || (user?.screens?.includes(id) ?? false);

  return (
    <AuthContext.Provider value={{ user, isAuthReady, login, logout, canAccessMain, canAccessScreen }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
