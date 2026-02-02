import React, { createContext, useContext, useMemo } from "react";
import { api } from "../api/client";
import { LanguageCode } from "../api/types";
import { useAuth } from "../auth/AuthContext";

type I18nContextValue = {
  language: LanguageCode;
  t: (key: string) => string;
  setLanguage: (language: LanguageCode) => Promise<void>;
};

const dictionaries: Record<LanguageCode, Record<string, string>> = {
  EN: {
    "common.save": "Save",
    "common.cancel": "Cancel",
    "settings.language": "Language",
    "settings.language.en": "English",
    "settings.language.af": "Afrikaans",
    "settings.language.xh": "isiXhosa",
    "settings.language.fr": "French"
  },
  AF: {},
  XH: {},
  FR: {}
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { session, updateUser } = useAuth();
  const language: LanguageCode = session?.user.language ?? "EN";

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string) => dictionaries[language]?.[key] ?? dictionaries.EN[key] ?? key;
    return {
      language,
      t,
      setLanguage: async (nextLanguage: LanguageCode) => {
        if (!session) return;
        const res = await api.patch<{ user: { language: LanguageCode } }>(
          "/users/me/language",
          { language: nextLanguage },
          session
        );
        await updateUser({ language: res.user.language });
      }
    };
  }, [language, session, updateUser]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("I18nContext not available");
  return ctx;
}

