import React from "react";
import { StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

export function TextField({
  label,
  error,
  containerStyle,
  ...inputProps
}: {
  label: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
} & TextInputProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const borderColor = error ? colors.danger : colors.border;
  const fontSize = Math.round(16 * config.typography.fontScale);
  const labelSize = Math.round(14 * config.typography.fontScale);
  const helperSize = Math.round(13 * config.typography.fontScale);
  const paddingVertical = Math.round(12 * Math.min(config.typography.fontScale, 1.2));
  const minHeight = config.interaction.minTouchSize;

  return (
    <View style={[{ gap: 8 }, containerStyle]}>
      <Text
        style={{
          color: colors.text,
          fontSize: labelSize,
          fontWeight: "700",
          letterSpacing: config.typography.letterSpacing
        }}
      >
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...inputProps}
        style={[
          {
            borderWidth: 1,
            borderColor,
            backgroundColor: colors.surface,
            minHeight,
            paddingVertical,
            paddingHorizontal: 12,
            borderRadius: 12,
            color: colors.text,
            fontSize,
            letterSpacing: config.typography.letterSpacing
          },
          inputProps.style
        ]}
      />
      {error ? (
        <Text style={{ color: colors.danger, fontSize: helperSize, letterSpacing: config.typography.letterSpacing }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
