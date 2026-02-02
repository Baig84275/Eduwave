import React from "react";
import { Platform, StyleProp, View, ViewStyle } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const radius = config.color.highContrast ? 14 : 16;
  const padding = Math.round(14 * Math.min(config.typography.fontScale, 1.2));
  const shadow =
    config.color.highContrast || colors.background === colors.surface
      ? {}
      : Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 }
          },
          android: {
            elevation: 2
          },
          default: {}
        });

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius,
          padding,
          ...(shadow as object)
        },
        style
      ]}
    >
      {children}
    </View>
  );
}
