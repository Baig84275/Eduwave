import React, { useEffect } from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "./Text";
import { tokens } from "../theme/tokens";

type ProgressColor = "primary" | "success" | "warning" | "danger";

export interface ProgressBarProps {
  value: number; // 0-100
  color?: ProgressColor;
  showLabel?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export function ProgressBar({
  value,
  color = "primary",
  showLabel = false,
  label,
  size = "md",
  animated = true,
  style,
}: ProgressBarProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const reduceMotion = config.motion.reduceMotion;

  const progress = useSharedValue(0);

  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));

  useEffect(() => {
    if (reduceMotion || !animated) {
      progress.value = clampedValue;
    } else {
      progress.value = withSpring(clampedValue, tokens.animation.spring.gentle);
    }
  }, [clampedValue, progress, reduceMotion, animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const getColors = (): [string, string] => {
    switch (color) {
      case "success":
        return [colors.success, colors.success];
      case "warning":
        return [colors.warning, colors.warning];
      case "danger":
        return [colors.danger, colors.danger];
      default:
        return [colors.gradientStart, colors.gradientEnd];
    }
  };

  const heights = {
    sm: 4,
    md: 8,
    lg: 12,
  };

  const height = heights[size];

  return (
    <View style={[styles.container, style]}>
      {(showLabel || label) && (
        <View style={styles.labelContainer}>
          {label && (
            <AppText variant="label" weight="medium">
              {label}
            </AppText>
          )}
          {showLabel && (
            <AppText variant="label" tone="muted">
              {Math.round(clampedValue)}%
            </AppText>
          )}
        </View>
      )}

      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: colors.surfaceAlt,
            borderRadius: height / 2,
          },
        ]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: clampedValue }}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              height,
              borderRadius: height / 2,
            },
            animatedStyle,
          ]}
        >
          <LinearGradient
            colors={getColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.gradient, { borderRadius: height / 2 }]}
          />
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * Circular Progress Ring
 */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: ProgressColor;
  showValue?: boolean;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 6,
  color = "primary",
  showValue = true,
  animated = true,
  style,
}: ProgressRingProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const reduceMotion = config.motion.reduceMotion;

  const progress = useSharedValue(0);

  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (reduceMotion || !animated) {
      progress.value = clampedValue;
    } else {
      progress.value = withTiming(clampedValue, {
        duration: 1000,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [clampedValue, progress, reduceMotion, animated]);

  const animatedCircleStyle = useAnimatedStyle(() => {
    const strokeDashoffset = circumference - (progress.value / 100) * circumference;
    return {
      strokeDashoffset,
    };
  });

  const getColor = () => {
    switch (color) {
      case "success":
        return colors.success;
      case "warning":
        return colors.warning;
      case "danger":
        return colors.danger;
      default:
        return colors.primary;
    }
  };

  return (
    <View
      style={[styles.ringContainer, { width: size, height: size }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clampedValue }}
    >
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceAlt}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={animatedCircleStyle}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {showValue && (
        <View style={styles.ringValue}>
          <AppText variant="label" weight="bold">
            {Math.round(clampedValue)}%
          </AppText>
        </View>
      )}
    </View>
  );
}

/**
 * Indeterminate Progress (loading spinner alternative)
 */
export function IndeterminateProgress({
  size = "md",
  color = "primary",
}: {
  size?: "sm" | "md" | "lg";
  color?: ProgressColor;
}) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const reduceMotion = config.motion.reduceMotion;

  const translateX = useSharedValue(0);

  const heights = { sm: 4, md: 8, lg: 12 };
  const height = heights[size];

  useEffect(() => {
    if (reduceMotion) return;

    const animate = () => {
      translateX.value = withTiming(-100, { duration: 0 }, () => {
        translateX.value = withTiming(100, { duration: 1000, easing: Easing.inOut(Easing.ease) }, () => {
          animate();
        });
      });
    };

    animate();
  }, [reduceMotion, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${translateX.value}%` }],
  }));

  const getColor = () => {
    switch (color) {
      case "success":
        return colors.success;
      case "warning":
        return colors.warning;
      case "danger":
        return colors.danger;
      default:
        return colors.primary;
    }
  };

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: colors.surfaceAlt,
          borderRadius: height / 2,
          overflow: "hidden",
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <Animated.View
        style={[
          styles.indeterminateFill,
          {
            height,
            backgroundColor: getColor(),
            borderRadius: height / 2,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.xs,
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
  },
  ringContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  ringValue: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  indeterminateFill: {
    width: "50%",
  },
});
