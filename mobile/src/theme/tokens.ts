/**
 * Design Tokens - Foundation for modern UI system
 * All measurements, spacing, shadows, and animation configs
 */

// Spacing scale (4px base unit)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// Border radius scale
export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  full: 9999,
} as const;

// Shadow definitions for depth levels
export const shadows = {
  none: {
    ios: {},
    android: { elevation: 0 },
  },
  sm: {
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 1 },
  },
  md: {
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
  },
  lg: {
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 4 },
  },
  xl: {
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 6 },
  },
  glow: {
    ios: {
      shadowColor: "#0E7490",
      shadowOpacity: 0.25,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 0 },
    },
    android: { elevation: 8 },
  },
} as const;

// Glassmorphism configurations
export const glass = {
  blur: {
    light: 10,
    medium: 20,
    heavy: 40,
  },
  opacity: {
    subtle: 0.6,
    medium: 0.75,
    strong: 0.9,
  },
  // Accessibility mode-specific glass settings
  accessibilityOverrides: {
    STANDARD: { blur: 20, opacity: 0.75 },
    VISUAL_SUPPORT: { blur: 5, opacity: 0.95 },
    READING_DYSLEXIA: { blur: 10, opacity: 0.85 },
    HEARING_SUPPORT: { blur: 20, opacity: 0.75 },
    MOBILITY_SUPPORT: { blur: 15, opacity: 0.85 },
    NEURODIVERSE: { blur: 10, opacity: 0.9 },
  },
} as const;

// Animation durations (in ms)
export const animation = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  // Spring configurations for reanimated
  spring: {
    gentle: { damping: 20, stiffness: 100 },
    snappy: { damping: 15, stiffness: 150 },
    bouncy: { damping: 10, stiffness: 180 },
  },
  // Easing presets
  easing: {
    easeOut: "easeOut" as const,
    easeIn: "easeIn" as const,
    easeInOut: "easeInOut" as const,
  },
} as const;

// Typography scale
export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 32,
    "5xl": 40,
  },
  weights: {
    thin: "300" as const,
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    black: "900" as const,
  },
  lineHeights: {
    tight: 1.1,
    normal: 1.2,
    relaxed: 1.4,
    loose: 1.6,
  },
} as const;

// Z-index scale for layering
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modal: 40,
  popover: 50,
  toast: 60,
} as const;

// Icon sizes
export const iconSizes = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
} as const;

// Touch target sizes
export const touchTargets = {
  sm: 36,
  md: 44,
  lg: 52,
} as const;

// Component-specific tokens
export const components = {
  button: {
    heights: {
      sm: 36,
      md: 44,
      lg: 52,
    },
    paddingHorizontal: {
      sm: 12,
      md: 16,
      lg: 20,
    },
    iconGap: 8,
  },
  card: {
    padding: {
      sm: 12,
      md: 16,
      lg: 20,
    },
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    labelOffset: 8,
  },
  avatar: {
    sizes: {
      xs: 24,
      sm: 32,
      md: 40,
      lg: 48,
      xl: 64,
      xxl: 80,
    },
  },
  badge: {
    heights: {
      sm: 20,
      md: 24,
    },
    paddingHorizontal: {
      sm: 6,
      md: 8,
    },
  },
  listItem: {
    minHeight: 56,
    padding: 16,
  },
  tabBar: {
    height: 60,
    iconSize: 24,
    labelSize: 11,
  },
  toast: {
    maxWidth: 360,
    minHeight: 52,
    padding: 16,
  },
} as const;

// Gradients — EduWave mockup palette
export const gradients = {
  primary: ["#007B8A", "#005F6B"] as [string, string],
  primaryDark: ["#005F6B", "#004A55"] as [string, string],
  success: ["#3A9E6F", "#2A7E52"] as [string, string],
  danger: ["#D32F2F", "#B71C1C"] as [string, string],
  warm: ["#F4861E", "#C4680F"] as [string, string],
  purple: ["#6B4FA0", "#4A2E7A"] as [string, string],
  neutral: ["#555555", "#888888"] as [string, string],
} as const;

// Export all tokens
export const tokens = {
  spacing,
  radius,
  shadows,
  glass,
  animation,
  typography,
  zIndex,
  iconSizes,
  touchTargets,
  components,
  gradients,
} as const;

export default tokens;
