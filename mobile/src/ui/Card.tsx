import React, { useCallback } from "react";
import { Platform, StyleProp, View, ViewStyle, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { tokens } from "../theme/tokens";
import { haptics } from "../animation";

type CardVariant = "solid" | "glass" | "outlined" | "elevated" | "gradient";
type CardElevation = "none" | "sm" | "md" | "lg";
type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
  elevation?: CardElevation;
  padding?: CardPadding;
  pressable?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  enableHaptics?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  children,
  style,
  variant = "solid",
  elevation = "md",
  padding = "md",
  pressable = false,
  onPress,
  disabled = false,
  enableHaptics = true,
}: CardProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const reduceMotion = config.motion.reduceMotion;
  const highContrast = config.color.highContrast;

  // Animation for pressable cards
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    if (!pressable || disabled) return;
    if (enableHaptics) {
      haptics.light();
    }
    if (reduceMotion) {
      scale.value = 0.98;
    } else {
      scale.value = withSpring(0.98, tokens.animation.spring.snappy);
    }
  }, [pressable, disabled, enableHaptics, reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    if (!pressable || disabled) return;
    if (reduceMotion) {
      scale.value = 1;
    } else {
      scale.value = withSpring(1, tokens.animation.spring.snappy);
    }
  }, [pressable, disabled, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Padding values
  const paddingValue =
    padding === "none"
      ? 0
      : padding === "sm"
        ? tokens.components.card.padding.sm
        : padding === "lg"
          ? tokens.components.card.padding.lg
          : tokens.components.card.padding.md;

  // Scale padding with font size
  const scaledPadding = Math.round(paddingValue * Math.min(config.typography.fontScale, 1.2));

  // Border radius
  const borderRadius = highContrast ? tokens.radius.md : tokens.radius.lg;

  // Get shadow based on elevation
  const getShadow = () => {
    if (highContrast || variant === "outlined" || elevation === "none") {
      return {};
    }

    const shadowConfig = tokens.shadows[elevation === "sm" ? "sm" : elevation === "lg" ? "lg" : "md"];
    return Platform.select({
      ios: shadowConfig.ios,
      android: shadowConfig.android,
      default: {},
    });
  };

  // Get background color based on variant
  const getBackgroundColor = () => {
    switch (variant) {
      case "glass":
        return colors.glassBackground;
      case "outlined":
        return "transparent";
      case "elevated":
        return colors.surfaceElevated;
      case "gradient":
        return "transparent";
      default:
        return colors.surface;
    }
  };

  // Get border style
  const getBorder = () => {
    switch (variant) {
      case "glass":
        return {
          borderWidth: 1,
          borderColor: colors.glassBorder,
        };
      case "outlined":
        return {
          borderWidth: 1,
          borderColor: colors.border,
        };
      default:
        return highContrast
          ? {
              borderWidth: 1,
              borderColor: colors.border,
            }
          : {
              borderWidth: 0,
              borderColor: "transparent",
            };
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderRadius,
    padding: scaledPadding,
    ...getBorder(),
    ...(getShadow() as object),
    overflow: "hidden",
  };

  // Glass variant with blur
  if (variant === "glass" && Platform.OS === "ios" && !highContrast) {
    const content = (
      <BlurView
        intensity={20}
        tint="light"
        style={[
          styles.blurContainer,
          {
            borderRadius,
            padding: scaledPadding,
          },
        ]}
      >
        <View
          style={[
            styles.glassOverlay,
            {
              backgroundColor: colors.glassBackground,
              borderRadius,
            },
          ]}
        />
        {children}
      </BlurView>
    );

    if (pressable && onPress) {
      return (
        <AnimatedPressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={[
            animatedStyle,
            {
              borderRadius,
              ...getBorder(),
              ...(getShadow() as object),
              overflow: "hidden",
              opacity: disabled ? 0.6 : 1,
            },
            style,
          ]}
        >
          {content}
        </AnimatedPressable>
      );
    }

    return (
      <View
        style={[
          {
            borderRadius,
            ...getBorder(),
            ...(getShadow() as object),
            overflow: "hidden",
          },
          style,
        ]}
      >
        {content}
      </View>
    );
  }

  // Gradient variant
  if (variant === "gradient") {
    const content = (
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            borderRadius,
            padding: scaledPadding,
          },
        ]}
      >
        {children}
      </LinearGradient>
    );

    if (pressable && onPress) {
      return (
        <AnimatedPressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={[
            animatedStyle,
            {
              borderRadius,
              ...(getShadow() as object),
              overflow: "hidden",
              opacity: disabled ? 0.6 : 1,
            },
            style,
          ]}
        >
          {content}
        </AnimatedPressable>
      );
    }

    return (
      <View
        style={[
          {
            borderRadius,
            ...(getShadow() as object),
            overflow: "hidden",
          },
          style,
        ]}
      >
        {content}
      </View>
    );
  }

  // Standard variants (solid, outlined, elevated)
  if (pressable && onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[animatedStyle, cardStyle, { opacity: disabled ? 0.6 : 1 }, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}

/**
 * Card Header component for consistent card titles
 */
export function CardHeader({
  title,
  subtitle,
  action,
  style,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { config } = useAccessibility();
  const colors = config.color.colors;

  return (
    <View style={[styles.cardHeader, style]}>
      <View style={styles.cardHeaderText}>
        <Animated.Text
          style={[
            styles.cardTitle,
            {
              color: colors.text,
              fontSize: 18 * config.typography.fontScale,
            },
          ]}
        >
          {title}
        </Animated.Text>
        {subtitle && (
          <Animated.Text
            style={[
              styles.cardSubtitle,
              {
                color: colors.textMuted,
                fontSize: 14 * config.typography.fontScale,
              },
            ]}
          >
            {subtitle}
          </Animated.Text>
        )}
      </View>
      {action && <View>{action}</View>}
    </View>
  );
}

/**
 * Card Footer for actions
 */
export function CardFooter({
  children,
  style,
  divider = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  divider?: boolean;
}) {
  const { config } = useAccessibility();
  const colors = config.color.colors;

  return (
    <View
      style={[
        styles.cardFooter,
        divider && {
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          marginTop: tokens.spacing.md,
          paddingTop: tokens.spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    overflow: "hidden",
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: tokens.spacing.sm,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: "700",
  },
  cardSubtitle: {
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
});
