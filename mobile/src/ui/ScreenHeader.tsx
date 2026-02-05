import React from "react";
import { View, ViewStyle } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "./Text";

export function ScreenHeader({
  title,
  subtitle,
  style
}: {
  title: string;
  subtitle?: string | null;
  style?: ViewStyle;
}) {
  const { config } = useAccessibility();
  const gap = (config.reading.preferChunkedText ? 8 : 6) + (config.navigation.density === "simplified" ? 2 : 0);

  return (
    <View style={[{ gap }, style]}>
      <AppText variant="title" weight="black">
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="subtitle" tone="muted">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

