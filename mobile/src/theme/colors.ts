export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryDark: string;
  accent: string;
  danger: string;
  success: string;
  focusRing: string;
};

const standardColors: ThemeColors = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F9",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#475569",
  primary: "#0E7490",
  primaryDark: "#155E75",
  accent: "#2563EB",
  danger: "#DC2626",
  success: "#16A34A",
  focusRing: "#38BDF8"
};

export function getColorsForAccessibilityMode(mode: string | null | undefined): ThemeColors {
  switch (mode) {
    case "VISUAL_SUPPORT":
      return {
        background: "#0B1020",
        surface: "#0F172A",
        surfaceAlt: "#111C34",
        border: "#93C5FD",
        text: "#FFFFFF",
        textMuted: "#E2E8F0",
        primary: "#22D3EE",
        primaryDark: "#06B6D4",
        accent: "#60A5FA",
        danger: "#FCA5A5",
        success: "#86EFAC",
        focusRing: "#FDE047"
      };
    case "NEURODIVERSE":
      return {
        ...standardColors,
        background: "#F7FAFC",
        surfaceAlt: "#EEF6FA",
        primary: "#0F766E",
        primaryDark: "#115E59",
        accent: "#1D4ED8",
        focusRing: "#34D399"
      };
    case "READING_DYSLEXIA":
      return {
        ...standardColors,
        background: "#FBF7ED",
        surfaceAlt: "#F6EEDD",
        textMuted: "#475569",
        focusRing: "#F59E0B"
      };
    default:
      return standardColors;
  }
}

