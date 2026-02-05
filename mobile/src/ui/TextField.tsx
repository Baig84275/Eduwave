import React, { useMemo, useState } from "react";
import { Platform, StyleProp, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "./Text";

export function TextField({
  label,
  error,
  helperText,
  containerStyle,
  ...inputProps
}: {
  label: string;
  error?: string | null;
  helperText?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
} & TextInputProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.focusRing : colors.border;
  const fontSize = Math.round(16 * config.typography.fontScale);
  const paddingVertical = Math.round(12 * Math.min(config.typography.fontScale, 1.2));
  const minHeight = config.interaction.minTouchSize;
  const shadow =
    config.color.highContrast || colors.background === colors.surface
      ? {}
      : Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 }
          },
          android: {
            elevation: 1
          },
          default: {}
        });

  const a11yLabel = useMemo(() => inputProps.accessibilityLabel ?? label, [inputProps.accessibilityLabel, label]);
  const a11yHint = useMemo(() => inputProps.accessibilityHint ?? inputProps.placeholder, [inputProps.accessibilityHint, inputProps.placeholder]);

  return (
    <View style={[{ gap: 8 }, containerStyle]}>
      <AppText variant="label" weight="semibold">
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...inputProps}
        accessibilityLabel={a11yLabel}
        accessibilityHint={a11yHint}
        onFocus={(e) => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
        style={[
          {
            borderWidth: 1,
            borderColor,
            backgroundColor: colors.surface,
            minHeight,
            paddingVertical,
            paddingHorizontal: 12,
            borderRadius: 14,
            color: colors.text,
            fontSize,
            letterSpacing: config.typography.letterSpacing,
            ...(shadow as object)
          },
          inputProps.style
        ]}
      />
      {error ? <AppText variant="caption" tone="danger" weight="semibold">{error}</AppText> : null}
      {!error && helperText ? <AppText variant="caption" tone="muted">{helperText}</AppText> : null}
    </View>
  );
}
