import React from "react";
import { View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "./Text";

type Tone = "danger" | "success" | "info";

export function InlineAlert({ tone, text }: { tone: Tone; text: string }) {
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const borderColor = tone === "danger" ? colors.danger : tone === "success" ? colors.success : colors.border;
  const backgroundColor = colors.surfaceAlt;
  const textTone = tone === "danger" ? "danger" : tone === "success" ? "success" : "muted";

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor,
        backgroundColor,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 14
      }}
    >
      <AppText variant="caption" tone={textTone as any} weight="semibold">
        {text}
      </AppText>
    </View>
  );
}
