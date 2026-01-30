import React, { createContext, useCallback, useContext, useMemo } from "react";
import { Platform } from "react-native";
import { api } from "../api/client";
import { getColorsForAccessibilityMode, ThemeColors } from "../theme/colors";
import { useAuth } from "../auth/AuthContext";

export type AccessibilityMode =
  | "STANDARD"
  | "VISUAL_SUPPORT"
  | "READING_DYSLEXIA"
  | "HEARING_SUPPORT"
  | "MOBILITY_SUPPORT"
  | "NEURODIVERSE";

export type AccessibilityConfig = {
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

function getTypographyForMode(mode: AccessibilityMode | null | undefined) {
  const fontFamily = Platform.select({ ios: "System", android: "System", default: "System" }) as string;

  switch (mode) {
    case "VISUAL_SUPPORT":
      return { fontFamily, fontScale: 1.25, lineHeightMultiplier: 1.2, letterSpacing: 0.2 };
    case "READING_DYSLEXIA":
      return { fontFamily, fontScale: 1.15, lineHeightMultiplier: 1.45, letterSpacing: 0.6 };
    case "MOBILITY_SUPPORT":
      return { fontFamily, fontScale: 1.1, lineHeightMultiplier: 1.25, letterSpacing: 0.2 };
    default:
      return { fontFamily, fontScale: 1, lineHeightMultiplier: 1.2, letterSpacing: 0.1 };
  }
}

function getAccessibilityConfig(mode: AccessibilityMode | null | undefined): AccessibilityConfig {
  const typography = getTypographyForMode(mode);
  const colors = getColorsForAccessibilityMode(mode ?? "STANDARD");

  const reduceMotion = mode === "NEURODIVERSE" || mode === "VISUAL_SUPPORT";
  const minTouchSize = mode === "MOBILITY_SUPPORT" || mode === "VISUAL_SUPPORT" ? 52 : 44;

  return {
    typography,
    color: { highContrast: mode === "VISUAL_SUPPORT", colors },
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
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const { session, updateUser } = useAuth();
  const mode = (session?.user.accessibilityMode ?? "STANDARD") as AccessibilityMode;

  const config = useMemo(() => getAccessibilityConfig(mode), [mode]);

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

  const value = useMemo<AccessibilityContextValue>(() => ({ mode, config, setMode }), [mode, config, setMode]);

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("AccessibilityContext not available");
  return ctx;
}
