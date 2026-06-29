import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import api from "@/lib/api";

interface User {
  id: string;
  phone: string;
  email?: string;
  name: string;
  role: string;
  subscription?: {
    status: string;
    startDate: string;
    endDate: string;
    plan: { name: string; slug: string };
  } | null;
  botConfig?: {
    id: string;
    isActive: boolean;
  } | null;
  botConnection?: {
    kind: "OWNED" | "POOL";
    status: "PENDING_LINK" | "LINKED";
    isActive: boolean;
  } | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  loginWithToken: (magicToken: string) => Promise<void>;
  register: (
    phone: string,
    password: string,
    name: string,
    email?: string,
    referralCode?: string
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("penny_token")
  );
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem("penny_token");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (phone: string, password: string) => {
    const { data } = await api.post("/auth/login", { phone, password });
    localStorage.setItem("penny_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  // Exchange a chat magic-link token for a session token (one-tap login).
  const loginWithToken = async (magicToken: string) => {
    const { data } = await api.post("/auth/magic", { token: magicToken });
    localStorage.setItem("penny_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (
    phone: string,
    password: string,
    name: string,
    email?: string,
    referralCode?: string
  ) => {
    const { data } = await api.post("/auth/register", {
      phone,
      password,
      name,
      ...(email ? { email } : {}),
      ...(referralCode ? { referralCode } : {}),
    });
    localStorage.setItem("penny_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("penny_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, loginWithToken, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
