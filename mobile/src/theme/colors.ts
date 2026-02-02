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

export function getColorsForAccessibility(options: {
  mode: string | null | undefined;
  highContrast: boolean;
  colorScheme: "default" | "warm" | "cool" | "monochrome";
}): ThemeColors {
  const base = options.highContrast ? getColorsForAccessibilityMode("VISUAL_SUPPORT") : getColorsForAccessibilityMode(options.mode);

  if (options.colorScheme === "default") return base;

  if (options.colorScheme === "warm") {
    return { ...base, primary: "#B45309", primaryDark: "#92400E", accent: "#F59E0B", focusRing: "#FDE047" };
  }
  if (options.colorScheme === "cool") {
    return { ...base, primary: "#0E7490", primaryDark: "#155E75", accent: "#2563EB", focusRing: "#38BDF8" };
  }
  return {
    background: options.highContrast ? "#000000" : "#F8FAFC",
    surface: options.highContrast ? "#000000" : "#FFFFFF",
    surfaceAlt: options.highContrast ? "#111111" : "#F1F5F9",
    border: options.highContrast ? "#FFFFFF" : "#CBD5E1",
    text: options.highContrast ? "#FFFFFF" : "#0F172A",
    textMuted: options.highContrast ? "#E5E7EB" : "#475569",
    primary: options.highContrast ? "#FFFFFF" : "#111827",
    primaryDark: options.highContrast ? "#FFFFFF" : "#0F172A",
    accent: options.highContrast ? "#FFFFFF" : "#111827",
    danger: base.danger,
    success: base.success,
    focusRing: options.highContrast ? "#FDE047" : "#94A3B8"
  };
}
