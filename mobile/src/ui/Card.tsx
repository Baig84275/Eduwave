import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const radius = config.color.highContrast ? 14 : 16;
  const padding = Math.round(14 * Math.min(config.typography.fontScale, 1.2));

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius,
          padding
        },
        style
      ]}
    >
      {children}
    </View>
  );
}
