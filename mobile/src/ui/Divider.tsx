import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "./Text";
import { tokens } from "../theme/tokens";

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  variant?: "full" | "inset" | "middle";
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function Divider({
  orientation = "horizontal",
  variant = "full",
  label,
  style,
}: DividerProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const getMargin = () => {
    switch (variant) {
      case "inset":
        return tokens.spacing.lg;
      case "middle":
        return tokens.spacing.xl;
      default:
        return 0;
    }
  };

  const margin = getMargin();

  if (orientation === "vertical") {
    return (
      <View
        style={[
          styles.vertical,
          {
            backgroundColor: colors.borderLight,
            marginVertical: margin,
          },
          style,
        ]}
        accessible={false}
      />
    );
  }

  if (label) {
    return (
      <View
        style={[
          styles.labelContainer,
          {
            marginHorizontal: margin,
          },
          style,
        ]}
        accessible={false}
      >
        <View style={[styles.line, { backgroundColor: colors.borderLight }]} />
        <AppText variant="caption" tone="muted" style={styles.label}>
          {label}
        </AppText>
        <View style={[styles.line, { backgroundColor: colors.borderLight }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        {
          backgroundColor: colors.borderLight,
          marginHorizontal: margin,
        },
        style,
      ]}
      accessible={false}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: "100%",
  },
  vertical: {
    width: 1,
    height: "100%",
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.spacing.sm,
  },
  line: {
    flex: 1,
    height: 1,
  },
  label: {
    paddingHorizontal: tokens.spacing.md,
  },
});
