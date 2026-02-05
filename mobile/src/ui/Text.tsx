import React from "react";
import { Text as RNText, TextProps, TextStyle } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Variant = "h1" | "h2" | "h3" | "title" | "subtitle" | "body" | "label" | "caption";
type Tone = "text" | "muted" | "primary" | "danger" | "success" | "white";
type Weight = "regular" | "medium" | "semibold" | "bold" | "black";

const baseSize: Record<Variant, number> = {
  h1: 32,
  h2: 24,
  h3: 20,
  title: 28,
  subtitle: 15,
  body: 16,
  label: 14,
  caption: 13
};

const weightValue: Record<Weight, TextStyle["fontWeight"]> = {
  regular: "500",
  medium: "600",
  semibold: "700",
  bold: "800",
  black: "900"
};

export function AppText({
  variant = "body",
  tone = "text",
  weight = "regular",
  style,
  ...props
}: TextProps & { variant?: Variant; tone?: Tone; weight?: Weight }) {
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const fontSize = Math.round(baseSize[variant] * config.typography.fontScale);
  const lineHeight = Math.round(fontSize * config.typography.lineHeightMultiplier);

  const color =
    tone === "muted"
      ? colors.textMuted
      : tone === "primary"
        ? colors.primary
        : tone === "danger"
          ? colors.danger
          : tone === "success"
            ? colors.success
            : tone === "white"
              ? "#FFFFFF"
              : colors.text;

  return (
    <RNText
      {...props}
      allowFontScaling={false}
      style={[
        {
          color,
          fontFamily: config.typography.fontFamily,
          fontSize,
          lineHeight,
          fontWeight: weightValue[weight],
          letterSpacing: config.typography.letterSpacing
        },
        style
      ]}
    />
  );
}

