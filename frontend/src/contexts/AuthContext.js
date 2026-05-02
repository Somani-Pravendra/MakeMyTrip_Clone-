import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from "react";
import apiClient from "../services/apiClient";
import { getWalletSummary } from "../services/walletService";
import {
  clearStoredAuth,
  clearStoredToken,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser
} from "../utils/authStorage";

const AuthContext = createContext();
const LEGACY_BOOKING_STORAGE_KEY = "mmt_bookings";

export const useAuth = () => useContext(AuthContext);

const normalizeAuthUser = (userData) => {
  if (!userData || typeof userData !== "object") return null;

  return {
    ...userData,
    name: String(userData.name || "").trim() || userData.email || "Traveller",
    walletBalance: typeof userData.walletBalance === "number" ? userData.walletBalance : 0
  };
};

const clearLegacyBookingCache = () => {
  try {
    localStorage.removeItem(LEGACY_BOOKING_STORAGE_KEY);
  } catch {
    // Ignore local-storage cleanup failures.
  }
};

function getStoredAuth() {
  const parsedUser = normalizeAuthUser(getStoredUser());
  const token = getStoredToken();

  if (parsedUser && token) {
    return {
      user: parsedUser,
      token
    };
  }

  return { user: null, token: null };
}

export const AuthProvider = ({ children }) => {
  const initialAuth = getStoredAuth();
  const [user, setUser] = useState(initialAuth.user);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!initialAuth.token);

  const setAuthToken = useCallback((token) => {
    if (token) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
      setStoredToken(token);
    } else if (token === null) {
      delete apiClient.defaults.headers.common.Authorization;
      clearStoredToken();
    }
  }, []);

  const login = useCallback((userData, token) => {
    const normalizedUser = normalizeAuthUser(userData);
    setUser(normalizedUser);
    setIsAuthenticated(true);
    if (token) setAuthToken(token);
    setStoredUser(normalizedUser);
  }, [setAuthToken]);

  const updateUser = useCallback((userData) => {
    const normalizedUser = normalizeAuthUser(userData);
    setUser(normalizedUser);
    setStoredUser(normalizedUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthToken(null);
    clearStoredAuth();
    clearLegacyBookingCache();
  }, [setAuthToken]);

  useEffect(() => {
    const t = getStoredToken();
    if (t) setAuthToken(t);
  }, [setAuthToken]);

  useEffect(() => {
    const handleAuthCleared = () => {
      setUser(null);
      setIsAuthenticated(false);
      clearLegacyBookingCache();
    };

    window.addEventListener("mmt:auth-cleared", handleAuthCleared);
    return () => {
      window.removeEventListener("mmt:auth-cleared", handleAuthCleared);
    };
  }, []);

  useEffect(() => {
    if (!getStoredToken() || !user) return;

    let active = true;

    const syncWalletBalance = async () => {
      try {
        const result = await getWalletSummary();
        if (!active || !result.success) return;

        if (typeof result.walletBalance === "number" && result.walletBalance !== user.walletBalance) {
          const updatedUser = { ...user, walletBalance: result.walletBalance };
          setUser(updatedUser);
          setStoredUser(updatedUser);
        }
      } catch (error) {
        if (!active) return;
      }
    };

    syncWalletBalance();

    return () => {
      active = false;
    };
  }, [user]);

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated,
    isAdmin: user?.isAdmin || false,
    login,
    updateUser,
    logout
  }), [user, isAuthenticated, login, updateUser, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
