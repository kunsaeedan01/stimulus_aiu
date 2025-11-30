import { useEffect, useState, useCallback } from "react";
import {
  me,
  login as apiLogin,
  logout as apiLogout,
} from "../api/auth.service";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setInitialized(true);
      setLoading(false);
      return;
    }

    try {
      const { data } = await me();
      setUser(data);
    } catch (err) {
      setUser(null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    } finally {
      setInitialized(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async ({ email, password }) => {
    setLoading(true);
    try {
      await apiLogin({ email, password });
      await loadUser();
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      apiLogout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    initialized,
    loading,
    login,
    logout,
    refresh: loadUser,
  };
}
