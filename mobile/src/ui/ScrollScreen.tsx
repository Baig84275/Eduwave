import React from "react";
import { ScrollView, StyleProp, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { tokens } from "../theme/tokens";

export function ScrollScreen({
  children,
  style
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const padding = Math.round(16 * Math.min(config.typography.fontScale, 1.25));
  const gap = (config.reading.preferChunkedText ? 14 : 12) + (config.navigation.density === "simplified" ? 2 : 0);

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      <ScrollView
        contentContainerStyle={{
          padding,
          gap,
          // Extra bottom padding so content clears the absolute-positioned tab bar
          paddingBottom: padding + tokens.components.tabBar.height,
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

