import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { api } from "../api/client";
import { getColorsForAccessibility, ThemeColors } from "../theme/colors";
import { useAuth } from "../auth/AuthContext";

export type AccessibilityMode =
  | "STANDARD"
  | "VISUAL_SUPPORT"
  | "READING_DYSLEXIA"
  | "HEARING_SUPPORT"
  | "MOBILITY_SUPPORT"
  | "NEURODIVERSE";

export type AccessibilityConfig = {
  granular: {
    fontSize: "small" | "medium" | "large" | "extra-large";
    lineSpacing: "compact" | "normal" | "relaxed" | "extra-relaxed";
    iconSize: "default" | "large" | "extra-large";
    reducedMotion: boolean;
    highContrast: boolean;
    colorScheme: "default" | "warm" | "cool" | "monochrome";
  };
  typography: {
    fontFamily: string;
    fontScale: number;
    lineHeightMultiplier: number;
    letterSpacing: number;
  };
  color: {
    highContrast: boolean;
    colors: ThemeColors;
  };
  motion: {
    reduceMotion: boolean;
    pressFeedbackOpacity: number;
  };
  interaction: {
    minTouchSize: number;
  };
  navigation: {
    density: "standard" | "simplified";
  };
  reading: {
    preferChunkedText: boolean;
  };
  alerts: {
    preferVisualIndicators: boolean;
  };
};

export const accessibilityModes: Array<{
  id: AccessibilityMode;
  title: string;
  subtitle: string;
}> = [
  { id: "STANDARD", title: "Standard Mode", subtitle: "Default experience" },
  { id: "VISUAL_SUPPORT", title: "Visual Support", subtitle: "High contrast and larger text" },
  { id: "READING_DYSLEXIA", title: "Reading & Dyslexia", subtitle: "Improved spacing and readability" },
  { id: "HEARING_SUPPORT", title: "Hearing Support", subtitle: "Visual-first alerts and cues" },
  { id: "MOBILITY_SUPPORT", title: "Mobility Support", subtitle: "Larger touch targets and simpler actions" },
  { id: "NEURODIVERSE", title: "Neurodiverse", subtitle: "Calmer UI with reduced motion" }
];

const STORAGE_KEY = "eduwave.accessibility.config.v1";

function defaultGranularForMode(mode: AccessibilityMode | null | undefined): AccessibilityConfig["granular"] {
  switch (mode) {
    case "VISUAL_SUPPORT":
      return {
        fontSize: "large",
        lineSpacing: "normal",
        iconSize: "large",
        reducedMotion: false,
        highContrast: true,
        colorScheme: "default"
      };
    case "HEARING_SUPPORT":
      return {
        fontSize: "medium",
        lineSpacing: "normal",
        iconSize: "default",
        reducedMotion: false,
        highContrast: false,
        colorScheme: "default"
      };
    case "MOBILITY_SUPPORT":
      return {
        fontSize: "medium",
        lineSpacing: "normal",
        iconSize: "extra-large",
        reducedMotion: false,
        highContrast: false,
        colorScheme: "default"
      };
    case "NEURODIVERSE":
      return {
        fontSize: "medium",
        lineSpacing: "relaxed",
        iconSize: "large",
        reducedMotion: true,
        highContrast: false,
        colorScheme: "warm"
      };
    case "READING_DYSLEXIA":
      return {
        fontSize: "medium",
        lineSpacing: "relaxed",
        iconSize: "default",
        reducedMotion: false,
        highContrast: false,
        colorScheme: "warm"
      };
    default:
      return {
        fontSize: "medium",
        lineSpacing: "normal",
        iconSize: "default",
        reducedMotion: false,
        highContrast: false,
        colorScheme: "default"
      };
  }
}

function normalizeGranularConfig(
  mode: AccessibilityMode | null | undefined,
  raw: any
): AccessibilityConfig["granular"] {
  const defaults = defaultGranularForMode(mode);
  if (!raw || typeof raw !== "object") return defaults;
  return { ...defaults, ...raw };
}

function getTypographyForConfig(mode: AccessibilityMode | null | undefined, granular: AccessibilityConfig["granular"]) {
  const fontFamily = Platform.select({ ios: "System", android: "System", default: "System" }) as string;

  const fontScale =
    granular.fontSize === "small"
      ? 0.92
      : granular.fontSize === "large"
        ? 1.15
        : granular.fontSize === "extra-large"
          ? 1.3
          : 1;

  const lineHeightMultiplier =
    granular.lineSpacing === "compact"
      ? 1.1
      : granular.lineSpacing === "relaxed"
        ? 1.4
        : granular.lineSpacing === "extra-relaxed"
          ? 1.6
          : 1.2;

  const letterSpacing = mode === "READING_DYSLEXIA" ? 0.6 : mode === "VISUAL_SUPPORT" ? 0.2 : 0.1;

  return { fontFamily, fontScale, lineHeightMultiplier, letterSpacing };
}

function getAccessibilityConfig(mode: AccessibilityMode | null | undefined, granular: AccessibilityConfig["granular"]): AccessibilityConfig {
  const typography = getTypographyForConfig(mode, granular);
  const colors = getColorsForAccessibility({
    mode: mode ?? "STANDARD",
    highContrast: granular.highContrast,
    colorScheme: granular.colorScheme
  });

  const reduceMotion = Boolean(granular.reducedMotion);
  const minTouchSize = mode === "MOBILITY_SUPPORT" || mode === "VISUAL_SUPPORT" ? 52 : 44;

  return {
    granular,
    typography,
    color: { highContrast: granular.highContrast, colors },
    motion: { reduceMotion, pressFeedbackOpacity: reduceMotion ? 0.93 : 0.85 },
    interaction: { minTouchSize },
    navigation: { density: mode === "MOBILITY_SUPPORT" || mode === "NEURODIVERSE" ? "simplified" : "standard" },
    reading: { preferChunkedText: mode === "READING_DYSLEXIA" || mode === "VISUAL_SUPPORT" || mode === "NEURODIVERSE" },
    alerts: { preferVisualIndicators: mode === "HEARING_SUPPORT" || mode === "VISUAL_SUPPORT" }
  };
}

type AccessibilityContextValue = {
  mode: AccessibilityMode;
  config: AccessibilityConfig;
  setMode: (mode: AccessibilityMode) => Promise<void>;
  setConfigPatch: (patch: Partial<AccessibilityConfig["granular"]>) => Promise<void>;
  setPreviewConfig: (next: AccessibilityConfig["granular"] | null) => void;
  resetToModeDefaults: (mode: AccessibilityMode) => Promise<void>;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const { session, updateUser } = useAuth();
  const mode = (session?.user.accessibilityMode ?? "STANDARD") as AccessibilityMode;
  const userId = session?.user.id ?? null;
  const accessToken = session?.accessToken ?? null;
  const [storedGranular, setStoredGranular] = useState<AccessibilityConfig["granular"]>(() =>
    normalizeGranularConfig(mode, session?.user.accessibilityConfig)
  );
  const [previewGranular, setPreviewGranular] = useState<AccessibilityConfig["granular"] | null>(null);

  useEffect(() => {
    if (!accessToken || !userId) {
      setStoredGranular(normalizeGranularConfig("STANDARD", null));
      setPreviewGranular(null);
      return;
    }
    const authSession = { accessToken, user: { id: userId } } as any;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setStoredGranular(normalizeGranularConfig(mode, parsed));
        }
      } catch (e) {
        void e;
      }
      try {
        const res = await api.get<{ mode: AccessibilityMode | null; config: AccessibilityConfig["granular"] }>("/accessibility/config", authSession);
        setStoredGranular(normalizeGranularConfig(res.mode ?? mode, res.config));
        await updateUser({ accessibilityConfig: res.config as any });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(res.config));
      } catch (e) {
        void e;
      }
    })();
  }, [accessToken, mode, updateUser, userId]);

  const effectiveGranular = previewGranular ?? storedGranular;
  const config = useMemo(() => getAccessibilityConfig(mode, effectiveGranular), [effectiveGranular, mode]);

  const setMode = useCallback(
    async (nextMode: AccessibilityMode) => {
      if (!session) {
        throw new Error("Not authenticated");
      }
      const res = await api.patch<{ user: { accessibilityMode: AccessibilityMode } }>(
        "/users/me/accessibility-mode",
        { accessibilityMode: nextMode },
        session
      );
      await updateUser({ accessibilityMode: res.user.accessibilityMode });
    },
    [session, updateUser]
  );

  const setConfigPatch = useCallback(
    async (patch: Partial<AccessibilityConfig["granular"]>) => {
      if (!session) throw new Error("Not authenticated");
      const res = await api.patch<{ mode: AccessibilityMode | null; config: AccessibilityConfig["granular"] }>(
        "/accessibility/config",
        patch,
        session
      );
      setStoredGranular(normalizeGranularConfig(res.mode ?? mode, res.config));
      setPreviewGranular(null);
      await updateUser({ accessibilityConfig: res.config as any });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(res.config));
    },
    [mode, session, updateUser]
  );

  const resetToModeDefaults = useCallback(
    async (nextMode: AccessibilityMode) => {
      if (!session) throw new Error("Not authenticated");
      const res = await api.post<{ mode: AccessibilityMode | null; config: AccessibilityConfig["granular"] }>(
        `/accessibility/reset?mode=${encodeURIComponent(nextMode)}`,
        {},
        session
      );
      setStoredGranular(normalizeGranularConfig(res.mode ?? nextMode, res.config));
      setPreviewGranular(null);
      await updateUser({ accessibilityMode: res.mode ?? nextMode, accessibilityConfig: res.config as any });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(res.config));
    },
    [session, updateUser]
  );

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      mode,
      config,
      setMode,
      setConfigPatch,
      setPreviewConfig: setPreviewGranular,
      resetToModeDefaults
    }),
    [config, mode, resetToModeDefaults, setConfigPatch, setMode]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("AccessibilityContext not available");
  return ctx;
}
