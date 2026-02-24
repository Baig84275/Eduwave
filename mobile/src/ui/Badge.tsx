import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "./Text";
import { tokens } from "../theme/tokens";

type BadgeVariant = "solid" | "outline" | "subtle";
type BadgeColor = "primary" | "success" | "warning" | "danger" | "info" | "neutral";
type BadgeSize = "sm" | "md";

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  color?: BadgeColor;
  size?: BadgeSize;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Badge({
  label,
  variant = "subtle",
  color = "primary",
  size = "md",
  icon,
  style,
}: BadgeProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;

  // Get color values based on color prop
  const getColors = () => {
    switch (color) {
      case "success":
        return {
          solid: { bg: colors.success, text: "#FFFFFF" },
          outline: { bg: "transparent", text: colors.success, border: colors.success },
          subtle: { bg: colors.successLight, text: colors.success },
        };
      case "warning":
        return {
          solid: { bg: colors.warning, text: "#FFFFFF" },
          outline: { bg: "transparent", text: colors.warning, border: colors.warning },
          subtle: { bg: colors.warningLight, text: colors.warning },
        };
      case "danger":
        return {
          solid: { bg: colors.danger, text: "#FFFFFF" },
          outline: { bg: "transparent", text: colors.danger, border: colors.danger },
          subtle: { bg: colors.dangerLight, text: colors.danger },
        };
      case "info":
        return {
          solid: { bg: colors.info, text: "#FFFFFF" },
          outline: { bg: "transparent", text: colors.info, border: colors.info },
          subtle: { bg: colors.infoLight, text: colors.info },
        };
      case "neutral":
        return {
          solid: { bg: colors.textMuted, text: "#FFFFFF" },
          outline: { bg: "transparent", text: colors.textMuted, border: colors.border },
          subtle: { bg: colors.surfaceAlt, text: colors.textMuted },
        };
      default:
        return {
          solid: { bg: colors.primary, text: "#FFFFFF" },
          outline: { bg: "transparent", text: colors.primary, border: colors.primary },
          subtle: { bg: colors.surfaceAlt, text: colors.primary },
        };
    }
  };

  const colorValues = getColors()[variant];
  const sizeConfig = {
    sm: {
      height: tokens.components.badge.heights.sm,
      paddingHorizontal: tokens.components.badge.paddingHorizontal.sm,
      fontSize: 11,
      iconSize: 12,
    },
    md: {
      height: tokens.components.badge.heights.md,
      paddingHorizontal: tokens.components.badge.paddingHorizontal.md,
      fontSize: 12,
      iconSize: 14,
    },
  };

  const currentSize = sizeConfig[size];

  return (
    <View
      style={[
        styles.badge,
        {
          height: currentSize.height,
          paddingHorizontal: currentSize.paddingHorizontal,
          backgroundColor: colorValues.bg,
          borderColor: variant === "outline" ? colorValues.border : "transparent",
          borderWidth: variant === "outline" ? 1 : 0,
          borderRadius: currentSize.height / 2,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <AppText
        variant="caption"
        weight="semibold"
        style={{
          color: colorValues.text,
          fontSize: currentSize.fontSize * config.typography.fontScale,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}

/**
 * Status Badge - common use case for status indicators
 */
export function StatusBadge({
  status,
  size = "md",
}: {
  status: "active" | "inactive" | "pending" | "completed" | "failed" | "paused";
  size?: BadgeSize;
}) {
  const statusConfig: Record<
    string,
    { label: string; color: BadgeColor; variant: BadgeVariant }
  > = {
    active: { label: "Active", color: "success", variant: "subtle" },
    inactive: { label: "Inactive", color: "neutral", variant: "subtle" },
    pending: { label: "Pending", color: "warning", variant: "subtle" },
    completed: { label: "Completed", color: "success", variant: "solid" },
    failed: { label: "Failed", color: "danger", variant: "subtle" },
    paused: { label: "Paused", color: "warning", variant: "outline" },
  };

  const config = statusConfig[status] ?? statusConfig.inactive;

  return <Badge label={config.label} color={config.color} variant={config.variant} size={size} />;
}

/**
 * Count Badge - for notification counts
 */
export function CountBadge({
  count,
  max = 99,
  color = "danger",
}: {
  count: number;
  max?: number;
  color?: BadgeColor;
}) {
  if (count <= 0) return null;

  return (
    <Badge
      label={count > max ? `${max}+` : String(count)}
      color={color}
      variant="solid"
      size="sm"
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    gap: 4,
  },
  icon: {
    marginRight: 2,
  },
});
