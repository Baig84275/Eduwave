import React, { useCallback } from "react";
import { View, StyleSheet, Pressable, StyleProp, ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "./Text";
import { tokens } from "../theme/tokens";
import { haptics } from "../animation";

export interface ListItemProps {
  title: string;
  subtitle?: string;
  description?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  showChevron?: boolean;
  selected?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
  enableHaptics?: boolean;
}

export function ListItem({
  title,
  subtitle,
  description,
  leftContent,
  rightContent,
  onPress,
  onLongPress,
  showChevron = false,
  selected = false,
  disabled = false,
  destructive = false,
  style,
  enableHaptics = true,
}: ListItemProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const reduceMotion = config.motion.reduceMotion;

  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    if (enableHaptics) {
      haptics.light();
    }
    if (reduceMotion) {
      scale.value = 0.98;
    } else {
      scale.value = withSpring(0.98, tokens.animation.spring.snappy);
    }
  }, [disabled, enableHaptics, reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    if (disabled) return;
    if (reduceMotion) {
      scale.value = 1;
    } else {
      scale.value = withSpring(1, tokens.animation.spring.snappy);
    }
  }, [disabled, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const minHeight = Math.max(tokens.components.listItem.minHeight, config.interaction.minTouchSize);
  const titleColor = destructive ? colors.danger : colors.text;

  const content = (
    <View style={[styles.container, { minHeight }]}>
      {/* Left Content */}
      {leftContent && <View style={styles.leftContent}>{leftContent}</View>}

      {/* Text Content */}
      <View style={styles.textContent}>
        <AppText
          variant="body"
          weight={selected ? "semibold" : "medium"}
          style={{ color: disabled ? colors.textMuted : titleColor }}
          numberOfLines={1}
        >
          {title}
        </AppText>

        {subtitle && (
          <AppText
            variant="caption"
            tone="muted"
            numberOfLines={1}
            style={{ marginTop: 2 }}
          >
            {subtitle}
          </AppText>
        )}

        {description && (
          <AppText
            variant="caption"
            tone="muted"
            numberOfLines={2}
            style={{ marginTop: 4 }}
          >
            {description}
          </AppText>
        )}
      </View>

      {/* Right Content */}
      {rightContent && <View style={styles.rightContent}>{rightContent}</View>}

      {/* Chevron */}
      {showChevron && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={colors.textMuted}
          style={styles.chevron}
        />
      )}
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        accessibilityState={{ disabled, selected }}
        style={({ pressed }) => [
          styles.pressable,
          {
            backgroundColor: selected
              ? colors.surfaceAlt
              : pressed
                ? colors.surfacePressed
                : colors.surface,
            opacity: disabled ? 0.6 : 1,
          },
          style,
        ]}
      >
        <Animated.View style={animatedStyle}>{content}</Animated.View>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.pressable,
        {
          backgroundColor: selected ? colors.surfaceAlt : colors.surface,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {content}
    </View>
  );
}

/**
 * List Item Separator
 */
export function ListItemSeparator({ inset = false }: { inset?: boolean }) {
  const { config } = useAccessibility();
  const colors = config.color.colors;

  return (
    <View
      style={[
        styles.separator,
        {
          backgroundColor: colors.borderLight,
          marginLeft: inset ? tokens.components.listItem.padding + 48 : 0,
        },
      ]}
    />
  );
}

/**
 * List Section Header
 */
export function ListSectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  const { config } = useAccessibility();
  const colors = config.color.colors;

  return (
    <View
      style={[
        styles.sectionHeader,
        {
          backgroundColor: colors.surfaceAlt,
          paddingHorizontal: tokens.components.listItem.padding,
        },
      ]}
    >
      <AppText variant="label" weight="semibold" tone="muted">
        {title.toUpperCase()}
      </AppText>
      {action && <View>{action}</View>}
    </View>
  );
}

/**
 * Navigation List Item - common pattern with icon and chevron
 */
export function NavigationListItem({
  title,
  subtitle,
  icon,
  iconColor,
  badge,
  onPress,
  destructive = false,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  badge?: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
}) {
  const { config } = useAccessibility();
  const colors = config.color.colors;

  return (
    <ListItem
      title={title}
      subtitle={subtitle}
      destructive={destructive}
      leftContent={
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: destructive ? colors.dangerLight : colors.surfaceAlt,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={iconColor ?? (destructive ? colors.danger : colors.primary)}
          />
        </View>
      }
      rightContent={badge}
      showChevron
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: tokens.radius.md,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.components.listItem.padding,
    paddingVertical: tokens.spacing.sm,
  },
  leftContent: {
    marginRight: tokens.spacing.md,
  },
  textContent: {
    flex: 1,
    justifyContent: "center",
  },
  rightContent: {
    marginLeft: tokens.spacing.sm,
  },
  chevron: {
    marginLeft: tokens.spacing.xs,
  },
  separator: {
    height: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: tokens.spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
