import React, { useCallback } from "react";
import { ActivityIndicator, Platform, Pressable, View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "./Text";
import { tokens } from "../theme/tokens";
import { haptics } from "../animation";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "glass" | "gradient";
type Size = "sm" | "md" | "lg";

export interface AppButtonProps {
  title?: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  enableHaptics?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AppButton({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  fullWidth = false,
  enableHaptics = true,
}: AppButtonProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const reduceMotion = config.motion.reduceMotion;
  const isDisabled = Boolean(disabled || loading);

  // Animation
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    if (enableHaptics) {
      haptics.light();
    }
    if (reduceMotion) {
      scale.value = 0.97;
    } else {
      scale.value = withSpring(0.97, tokens.animation.spring.snappy);
    }
  }, [enableHaptics, reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    if (reduceMotion) {
      scale.value = 1;
    } else {
      scale.value = withSpring(1, tokens.animation.spring.snappy);
    }
  }, [reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Size configurations
  const sizeConfig = {
    sm: {
      height: tokens.components.button.heights.sm,
      paddingHorizontal: tokens.components.button.paddingHorizontal.sm,
      fontSize: 14,
      iconSize: 16,
    },
    md: {
      height: Math.max(tokens.components.button.heights.md, config.interaction.minTouchSize),
      paddingHorizontal: tokens.components.button.paddingHorizontal.md,
      fontSize: 16,
      iconSize: 18,
    },
    lg: {
      height: Math.max(tokens.components.button.heights.lg, config.interaction.minTouchSize),
      paddingHorizontal: tokens.components.button.paddingHorizontal.lg,
      fontSize: 18,
      iconSize: 20,
    },
  };

  const currentSize = sizeConfig[size];

  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: colors.primary,
          borderColor: "transparent",
          textColor: colors.textInverse,
        };
      case "secondary":
        return {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
          textColor: colors.text,
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          borderColor: colors.border,
          textColor: colors.primary,
        };
      case "danger":
        return {
          backgroundColor: colors.danger,
          borderColor: "transparent",
          textColor: colors.textInverse,
        };
      case "success":
        return {
          backgroundColor: colors.success,
          borderColor: "transparent",
          textColor: colors.textInverse,
        };
      case "glass":
        return {
          backgroundColor: colors.glassBackground,
          borderColor: colors.glassBorder,
          textColor: colors.text,
        };
      case "gradient":
        return {
          backgroundColor: "transparent",
          borderColor: "transparent",
          textColor: colors.textInverse,
        };
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: "transparent",
          textColor: colors.textInverse,
        };
    }
  };

  const variantStyles = getVariantStyles();

  // Shadow for elevated variants
  const shadow =
    isDisabled || variant === "ghost" || variant === "glass"
      ? {}
      : Platform.select({
          ios: {
            shadowColor: variant === "primary" ? colors.primary : "#000",
            shadowOpacity: variant === "primary" ? 0.25 : 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
          },
          android: {
            elevation: 4,
          },
          default: {},
        });

  // Glass blur effect shadow
  const glassShadow =
    variant === "glass"
      ? Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
          },
          android: {
            elevation: 2,
          },
          default: {},
        })
      : {};

  const buttonContent = (
    <View style={styles.contentContainer}>
      {loading ? (
        <ActivityIndicator
          color={variantStyles.textColor}
          size={size === "sm" ? "small" : "small"}
        />
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <View style={{ marginRight: tokens.components.button.iconGap }}>{icon}</View>
          )}
          {title && (
            <AppText
              variant={size === "sm" ? "label" : "body"}
              weight="bold"
              style={{ color: variantStyles.textColor }}
            >
              {title}
            </AppText>
          )}
          {icon && iconPosition === "right" && (
            <View style={{ marginLeft: tokens.components.button.iconGap }}>{icon}</View>
          )}
        </>
      )}
    </View>
  );

  const buttonStyles = [
    styles.button,
    {
      minHeight: currentSize.height,
      paddingHorizontal: currentSize.paddingHorizontal,
      borderRadius: tokens.radius.lg,
      opacity: isDisabled ? 0.55 : 1,
    },
    fullWidth && styles.fullWidth,
  ];

  // Render gradient variant
  if (variant === "gradient" && !isDisabled) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
        accessibilityLabel={title}
        style={[animatedStyle, fullWidth && styles.fullWidth]}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            buttonStyles,
            shadow as object,
            { backgroundColor: undefined, borderWidth: 0 },
          ]}
        >
          {buttonContent}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      accessibilityLabel={title}
      style={[
        animatedStyle,
        buttonStyles,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: variant === "ghost" || variant === "secondary" ? 1 : 0,
        },
        shadow as object,
        glassShadow as object,
      ]}
    >
      {buttonContent}
    </AnimatedPressable>
  );
}

/**
 * Icon-only button variant
 */
export function IconButton({
  icon,
  onPress,
  disabled,
  variant = "ghost",
  size = "md",
  enableHaptics = true,
  accessibilityLabel,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "glass";
  size?: Size;
  enableHaptics?: boolean;
  accessibilityLabel: string;
}) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const reduceMotion = config.motion.reduceMotion;

  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    if (enableHaptics) {
      haptics.light();
    }
    if (reduceMotion) {
      scale.value = 0.9;
    } else {
      scale.value = withSpring(0.9, tokens.animation.spring.snappy);
    }
  }, [enableHaptics, reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    if (reduceMotion) {
      scale.value = 1;
    } else {
      scale.value = withSpring(1, tokens.animation.spring.snappy);
    }
  }, [reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sizeMap = {
    sm: tokens.touchTargets.sm,
    md: tokens.touchTargets.md,
    lg: tokens.touchTargets.lg,
  };

  const buttonSize = Math.max(sizeMap[size], config.interaction.minTouchSize);

  const getBackgroundColor = () => {
    switch (variant) {
      case "primary":
        return colors.primary;
      case "secondary":
        return colors.surfaceAlt;
      case "glass":
        return colors.glassBackground;
      default:
        return "transparent";
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={[
        animatedStyle,
        styles.iconButton,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor: getBackgroundColor(),
          borderColor: variant === "ghost" ? colors.border : "transparent",
          borderWidth: variant === "ghost" ? 1 : 0,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      {icon}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: {
    width: "100%",
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
  },
});
