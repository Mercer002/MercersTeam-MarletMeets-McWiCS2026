import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { login as apiLogin, logout as apiLogout, setAuthToken, signupSenior, signupStudent } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");
    if (stored) {
      setAuthToken(stored);
      setToken(stored);
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const handleAuth = (nextToken, nextUser) => {
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("auth_token", nextToken);
    localStorage.setItem("auth_user", JSON.stringify(nextUser));
  };

  const login = async (payload) => {
    const data = await apiLogin(payload);
    handleAuth(data.token, data.user);
    return data;
  };

  const signup = async (role, payload) => {
    const data = role === "senior" ? await signupSenior(payload) : await signupStudent(payload);
    handleAuth(data.token, data.user);
    return data;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (err) {
      // ignore
    }
    setAuthToken(null);
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  };

  const value = useMemo(
    () => ({ user, token, loading, login, signup, logout }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
