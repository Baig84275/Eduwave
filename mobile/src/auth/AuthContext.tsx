import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { AuthSession, User } from "../api/types";

type AuthContextValue = {
  session: AuthSession | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    role?: "PARENT" | "FACILITATOR" | "TEACHER" | "THERAPIST",
    invitationToken?: string,
    organisationId?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "eduwave.session.v1";

function stableStringify(value: any): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  if (t !== "object") return JSON.stringify(value);
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

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

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: User }>("/auth/login", { email, password });
    const next: AuthSession = { accessToken: res.accessToken, user: res.user };
    setSession(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const register = useCallback(
    async (email: string, password: string, role?: "PARENT" | "FACILITATOR" | "TEACHER" | "THERAPIST", invitationToken?: string, organisationId?: string) => {
      const res = await api.post<{ accessToken: string; user: User }>("/auth/register", {
        email,
        password,
        role,
        invitationToken,
        ...(organisationId ? { organisationId } : {})
      });
      const next: AuthSession = { accessToken: res.accessToken, user: res.user };
      setSession(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    []
  );

  const logout = useCallback(async () => {
    setSession(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateUser = useCallback(async (patch: Partial<User>) => {
    let didChange = false;
    setSession((prev) => {
      if (!prev) return prev;
      const nextUser: any = { ...prev.user };
      for (const [key, value] of Object.entries(patch)) {
        const current = (prev.user as any)[key];
        let equal = current === value;
        if (!equal && current && value && typeof current === "object" && typeof value === "object") {
          try {
            equal = stableStringify(current) === stableStringify(value);
          } catch {
            equal = false;
          }
        }
        if (!equal) {
          nextUser[key] = value;
          didChange = true;
        }
      }
      if (!didChange) return prev;
      return { ...prev, user: nextUser };
    });

    if (!didChange) return;

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
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return { session, login, register, logout, updateUser };
  }, [login, logout, register, session, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthContext not available");
  return ctx;
}
