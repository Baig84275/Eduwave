import React from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "./Text";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

export function AppButton({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary",
  icon
}: {
  title: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  icon?: React.ReactNode;
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
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      style={({ pressed }) => [
        {
          backgroundColor,
          borderColor,
          borderWidth: 1,
          minHeight: config.interaction.minTouchSize,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 16,
          opacity: isDisabled ? 0.55 : pressed ? config.motion.pressFeedbackOpacity : 1,
          ...(shadow as object)
        }
      ]}
    >
      <View style={{ flexDirection: "row", gap: 10, justifyContent: "center", alignItems: "center" }}>
        {loading ? <ActivityIndicator color={textColor} /> : null}
        {!loading && icon ? <View style={{ marginTop: 1 }}>{icon}</View> : null}
        <AppText
          variant="body"
          tone={textColor === "#FFFFFF" ? "white" : textColor === colors.primary ? "primary" : "text"}
          weight="bold"
        >
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}
