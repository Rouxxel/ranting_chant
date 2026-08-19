import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authGetMe, authLogin, authLogout, authRefresh } from "../services/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "tenant" | "manager" | "admin";
  unit?: string;
  propertyId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: "tenant" | "manager") => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (token) {
          const userData = await authGetMe();
          setUser({
            id: userData.id,
            name: userData.name,
            email: userData.email || "",
            role: userData.role as "tenant" | "manager" | "admin",
            unit: undefined,
            propertyId: undefined,
          });
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("auth_token");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, role: "tenant" | "manager") => {
    try {
      const response = await authLogin(email, password);
      localStorage.setItem("auth_token", response.access_token);
      if (response.refresh_token) {
        localStorage.setItem("refresh_token", response.refresh_token);
      }
      setUser({
        id: response.actor.id,
        name: response.actor.name,
        email: response.actor.email || "",
        role: response.role as "tenant" | "manager" | "admin",
        unit: undefined,
        propertyId: undefined,
      });
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authLogout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
    }
  };

  const refreshToken = async () => {
    try {
      const currentRefreshToken = localStorage.getItem("refresh_token");
      if (!currentRefreshToken) {
        throw new Error("No refresh token available");
      }
      const response = await authRefresh(currentRefreshToken);
      localStorage.setItem("auth_token", response.access_token);
      if (response.refresh_token) {
        localStorage.setItem("refresh_token", response.refresh_token);
      }
      setUser({
        id: response.actor.id,
        name: response.actor.name,
        email: response.actor.email || "",
        role: response.role as "tenant" | "manager" | "admin",
        unit: undefined,
        propertyId: undefined,
      });
    } catch (error) {
      console.error("Token refresh failed:", error);
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
