export type ThemeColors = {
  // Base colors
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  surfacePressed: string;
  border: string;
  borderLight: string;

  // Text colors
  text: string;
  textMuted: string;
  textInverse: string;

  // Brand colors
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;

  // Semantic colors
  danger: string;
  dangerLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;

  // Interactive states
  focusRing: string;

  // Glassmorphism colors
  glassBackground: string;
  glassBorder: string;
  glassBackgroundDark: string;

  // Gradient endpoints
  gradientStart: string;
  gradientEnd: string;

  // Tab bar specific
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;

  // Overlay
  overlay: string;
  overlayLight: string;
};

const standardColors: ThemeColors = {
  // Base
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F9",
  surfaceElevated: "#FFFFFF",
  surfacePressed: "#E0F4F7",
  border: "#E4E4E4",
  borderLight: "#F0F0F0",

  // Text
  text: "#1A1A2E",
  textMuted: "#888888",
  textInverse: "#FFFFFF",

  // Brand — EduWave mockup palette
  primary: "#007B8A",
  primaryDark: "#005F6B",
  primaryLight: "#E0F4F7",
  accent: "#F4861E",

  // Semantic
  danger: "#D32F2F",
  dangerLight: "#FFEBEE",
  success: "#3A9E6F",
  successLight: "#E5F5EE",
  warning: "#F4861E",
  warningLight: "#FEF3E8",
  info: "#6B4FA0",
  infoLight: "#F0EBF8",

  // Interactive
  focusRing: "#007B8A",

  // Glassmorphism
  glassBackground: "rgba(255, 255, 255, 0.75)",
  glassBorder: "rgba(255, 255, 255, 0.18)",
  glassBackgroundDark: "rgba(26, 26, 46, 0.75)",

  // Gradients
  gradientStart: "#007B8A",
  gradientEnd: "#005F6B",

  // Tab bar
  tabBarBackground: "rgba(255, 255, 255, 0.97)",
  tabBarBorder: "rgba(224, 224, 224, 0.8)",
  tabBarActive: "#007B8A",
  tabBarInactive: "#999999",

  // Overlay
  overlay: "rgba(26, 26, 46, 0.5)",
  overlayLight: "rgba(26, 26, 46, 0.25)",
};

export function getColorsForAccessibilityMode(mode: string | null | undefined): ThemeColors {
  switch (mode) {
    case "VISUAL_SUPPORT":
      return {
        // Base - Dark theme for high contrast
        background: "#0B1020",
        surface: "#0F172A",
        surfaceAlt: "#111C34",
        surfaceElevated: "#1E293B",
        surfacePressed: "#334155",
        border: "#93C5FD",
        borderLight: "#1E293B",

        // Text
        text: "#FFFFFF",
        textMuted: "#E2E8F0",
        textInverse: "#0F172A",

        // Brand - Bright colors for visibility
        primary: "#22D3EE",
        primaryDark: "#06B6D4",
        primaryLight: "#67E8F9",
        accent: "#60A5FA",

        // Semantic - Bright versions
        danger: "#FCA5A5",
        dangerLight: "#450A0A",
        success: "#86EFAC",
        successLight: "#052E16",
        warning: "#FDE047",
        warningLight: "#422006",
        info: "#93C5FD",
        infoLight: "#1E3A5F",

        // Interactive
        focusRing: "#FDE047",

        // Glassmorphism - More solid for contrast
        glassBackground: "rgba(15, 23, 42, 0.95)",
        glassBorder: "rgba(147, 197, 253, 0.3)",
        glassBackgroundDark: "rgba(15, 23, 42, 0.98)",

        // Gradients
        gradientStart: "#22D3EE",
        gradientEnd: "#67E8F9",

        // Tab bar
        tabBarBackground: "rgba(15, 23, 42, 0.98)",
        tabBarBorder: "rgba(147, 197, 253, 0.3)",
        tabBarActive: "#22D3EE",
        tabBarInactive: "#64748B",

        // Overlay
        overlay: "rgba(0, 0, 0, 0.7)",
        overlayLight: "rgba(0, 0, 0, 0.5)",
      };

    case "NEURODIVERSE":
      return {
        ...standardColors,
        // Calmer, warmer tones
        background: "#F7FAFC",
        surfaceAlt: "#EEF6FA",
        primary: "#0F766E",
        primaryDark: "#115E59",
        primaryLight: "#5EEAD4",
        accent: "#1D4ED8",
        focusRing: "#34D399",

        // Softer gradients
        gradientStart: "#0F766E",
        gradientEnd: "#5EEAD4",

        // Glass - More solid to reduce visual noise
        glassBackground: "rgba(255, 255, 255, 0.9)",
        glassBorder: "rgba(255, 255, 255, 0.25)",
      };

    case "READING_DYSLEXIA":
      return {
        ...standardColors,
        // Warm background reduces visual stress
        background: "#FBF7ED",
        surfaceAlt: "#F6EEDD",
        surface: "#FFFDF7",
        surfaceElevated: "#FFFDF7",
        textMuted: "#475569",
        focusRing: "#F59E0B",

        // Warm gradients
        gradientStart: "#B45309",
        gradientEnd: "#F59E0B",

        // Glass with warm tint
        glassBackground: "rgba(251, 247, 237, 0.85)",
        glassBorder: "rgba(245, 158, 11, 0.15)",
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
  const base = options.highContrast
    ? getColorsForAccessibilityMode("VISUAL_SUPPORT")
    : getColorsForAccessibilityMode(options.mode);

  if (options.colorScheme === "default") return base;

  if (options.colorScheme === "warm") {
    return {
      ...base,
      primary: "#B45309",
      primaryDark: "#92400E",
      primaryLight: "#FCD34D",
      accent: "#F59E0B",
      focusRing: "#FDE047",
      gradientStart: "#B45309",
      gradientEnd: "#F59E0B",
      tabBarActive: "#B45309",
    };
  }

  if (options.colorScheme === "cool") {
    return {
      ...base,
      primary: "#0E7490",
      primaryDark: "#155E75",
      primaryLight: "#67E8F9",
      accent: "#2563EB",
      focusRing: "#38BDF8",
      gradientStart: "#0E7490",
      gradientEnd: "#22D3EE",
      tabBarActive: "#0E7490",
    };
  }

  // Monochrome
  return {
    background: options.highContrast ? "#000000" : "#F8FAFC",
    surface: options.highContrast ? "#000000" : "#FFFFFF",
    surfaceAlt: options.highContrast ? "#111111" : "#F1F5F9",
    surfaceElevated: options.highContrast ? "#1A1A1A" : "#FFFFFF",
    surfacePressed: options.highContrast ? "#333333" : "#E2E8F0",
    border: options.highContrast ? "#FFFFFF" : "#CBD5E1",
    borderLight: options.highContrast ? "#333333" : "#E2E8F0",

    text: options.highContrast ? "#FFFFFF" : "#0F172A",
    textMuted: options.highContrast ? "#E5E7EB" : "#475569",
    textInverse: options.highContrast ? "#000000" : "#FFFFFF",

    primary: options.highContrast ? "#FFFFFF" : "#111827",
    primaryDark: options.highContrast ? "#FFFFFF" : "#0F172A",
    primaryLight: options.highContrast ? "#E5E7EB" : "#6B7280",
    accent: options.highContrast ? "#FFFFFF" : "#111827",

    danger: base.danger,
    dangerLight: options.highContrast ? "#450A0A" : "#FEE2E2",
    success: base.success,
    successLight: options.highContrast ? "#052E16" : "#DCFCE7",
    warning: base.warning,
    warningLight: options.highContrast ? "#422006" : "#FEF3C7",
    info: base.info,
    infoLight: options.highContrast ? "#1E3A5F" : "#DBEAFE",

    focusRing: options.highContrast ? "#FDE047" : "#94A3B8",

    glassBackground: options.highContrast ? "rgba(0, 0, 0, 0.95)" : "rgba(255, 255, 255, 0.8)",
    glassBorder: options.highContrast ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.1)",
    glassBackgroundDark: options.highContrast ? "rgba(0, 0, 0, 0.98)" : "rgba(0, 0, 0, 0.75)",

    gradientStart: options.highContrast ? "#FFFFFF" : "#475569",
    gradientEnd: options.highContrast ? "#E5E7EB" : "#94A3B8",

    tabBarBackground: options.highContrast ? "rgba(0, 0, 0, 0.98)" : "rgba(255, 255, 255, 0.95)",
    tabBarBorder: options.highContrast ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
    tabBarActive: options.highContrast ? "#FFFFFF" : "#111827",
    tabBarInactive: options.highContrast ? "#6B7280" : "#9CA3AF",

    overlay: options.highContrast ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.5)",
    overlayLight: options.highContrast ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.25)",
  };
}

// Utility to get alpha version of a color
export function withAlpha(color: string, alpha: number): string {
  // Handle hex colors
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  // Handle existing rgba
  if (color.startsWith("rgba")) {
    return color.replace(/[\d.]+\)$/, `${alpha})`);
  }
  return color;
}

// Export standard colors for reference
export { standardColors };
