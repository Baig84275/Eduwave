import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { tokens } from "../theme/tokens";

export function Screen({
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
      {/* paddingBottom clears the absolute-positioned tab bar */}
      <View style={{ flex: 1, padding, gap, paddingBottom: tokens.components.tabBar.height }}>
        {children}
      </View>
    </SafeAreaView>
  );
}
