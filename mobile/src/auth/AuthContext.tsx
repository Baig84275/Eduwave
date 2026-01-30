import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { AuthSession, User } from "../api/types";

type AuthContextValue = {
  session: AuthSession | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role?: "PARENT" | "FACILITATOR") => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "eduwave.session.v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as AuthSession;
        if (parsed?.accessToken && parsed?.user?.id) setSession(parsed);
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      session,
      login: async (email: string, password: string) => {
        const res = await api.post<{ accessToken: string; user: User }>("/auth/login", { email, password });
        const next: AuthSession = { accessToken: res.accessToken, user: res.user };
        setSession(next);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      },
      register: async (email: string, password: string, role?: "PARENT" | "FACILITATOR") => {
        const res = await api.post<{ accessToken: string; user: User }>("/auth/register", { email, password, role });
        const next: AuthSession = { accessToken: res.accessToken, user: res.user };
        setSession(next);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      },
      logout: async () => {
        setSession(null);
        await AsyncStorage.removeItem(STORAGE_KEY);
      },
      updateUser: async (patch: Partial<User>) => {
        setSession((prev) => {
          if (!prev) return prev;
          return { ...prev, user: { ...prev.user, ...patch } };
        });
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as AuthSession;
          if (!parsed?.accessToken || !parsed?.user?.id) return;
          const next: AuthSession = { ...parsed, user: { ...parsed.user, ...patch } };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      }
    };
  }, [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthContext not available");
  return ctx;
}
