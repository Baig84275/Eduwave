import React from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

export function AppButton({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary"
}: {
  title: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
}) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const isDisabled = Boolean(disabled || loading);

  const backgroundColor =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
        ? colors.surfaceAlt
        : variant === "danger"
          ? colors.danger
          : variant === "success"
            ? colors.success
            : "transparent";
  const borderColor = variant === "secondary" || variant === "ghost" ? colors.border : "transparent";
  const textColor = variant === "secondary" ? colors.text : variant === "ghost" ? colors.primary : "#FFFFFF";
  const shadow =
    isDisabled || variant === "ghost" || variant === "secondary"
      ? {}
      : Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 8 }
          },
          android: {
            elevation: 3
          },
          default: {}
        });

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          backgroundColor,
          borderColor,
          borderWidth: 1,
          minHeight: config.interaction.minTouchSize,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 14,
          opacity: isDisabled ? 0.55 : pressed ? config.motion.pressFeedbackOpacity : 1,
          ...(shadow as object)
        }
      ]}
    >
      <View style={{ flexDirection: "row", gap: 10, justifyContent: "center", alignItems: "center" }}>
        {loading ? <ActivityIndicator color={textColor} /> : null}
        <Text
          style={{
            color: textColor,
            fontSize: Math.round(16 * config.typography.fontScale),
            fontWeight: "800",
            letterSpacing: config.typography.letterSpacing
          }}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}
