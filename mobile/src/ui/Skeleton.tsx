import React, { useEffect } from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { tokens } from "../theme/tokens";

type SkeletonVariant = "text" | "circular" | "rectangular" | "rounded";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: SkeletonVariant;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = "100%",
  height = 16,
  variant = "text",
  style,
}: SkeletonProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const reduceMotion = config.motion.reduceMotion;

  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;

    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [reduceMotion, shimmerProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { opacity: 0.7 };
    }

    const translateX = interpolate(shimmerProgress.value, [0, 1], [-200, 200]);

    return {
      transform: [{ translateX }],
    };
  });

  const getBorderRadius = () => {
    switch (variant) {
      case "circular":
        return typeof height === "number" ? height / 2 : 50;
      case "rectangular":
        return 0;
      case "rounded":
        return tokens.radius.md;
      default:
        return tokens.radius.xs;
    }
  };

  const baseColor = colors.surfaceAlt;
  const highlightColor = colors.surface;

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius: getBorderRadius(),
          backgroundColor: baseColor,
          overflow: "hidden",
        },
        style,
      ]}
      accessibilityLabel="Loading..."
      accessibilityRole="progressbar"
    >
      {!reduceMotion && (
        <Animated.View style={[styles.shimmer, animatedStyle]}>
          <LinearGradient
            colors={[baseColor, highlightColor, baseColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          />
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Pre-built skeleton for text lines
 */
export function SkeletonText({
  lines = 3,
  lastLineWidth = "60%",
}: {
  lines?: number;
  lastLineWidth?: number | string;
}) {
  return (
    <View style={styles.textContainer}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : "100%"}
          height={14}
          variant="text"
          style={{ marginBottom: index < lines - 1 ? 8 : 0 }}
        />
      ))}
    </View>
  );
}

/**
 * Pre-built skeleton for avatars
 */
export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} variant="circular" />;
}

/**
 * Pre-built skeleton for cards
 */
export function SkeletonCard() {
  const { config } = useAccessibility();
  const colors = config.color.colors;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <SkeletonAvatar size={48} />
        <View style={styles.cardHeaderText}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
      <SkeletonText lines={3} />
    </View>
  );
}

/**
 * Pre-built skeleton for list items
 */
export function SkeletonListItem() {
  return (
    <View style={styles.listItem}>
      <SkeletonAvatar size={40} />
      <View style={styles.listItemText}>
        <Skeleton width="80%" height={14} />
        <Skeleton width="50%" height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/**
 * Pre-built skeleton for images
 */
export function SkeletonImage({
  width = "100%",
  height = 200,
  aspectRatio,
}: {
  width?: number | string;
  height?: number | string;
  aspectRatio?: number;
}) {
  return (
    <Skeleton
      width={width}
      height={aspectRatio ? undefined : height}
      variant="rounded"
      style={aspectRatio ? { aspectRatio } : undefined}
    />
  );
}

/**
 * Pre-built skeleton for buttons
 */
export function SkeletonButton({
  width = 120,
  size = "md",
}: {
  width?: number | string;
  size?: "sm" | "md" | "lg";
}) {
  const heights = {
    sm: tokens.components.button.heights.sm,
    md: tokens.components.button.heights.md,
    lg: tokens.components.button.heights.lg,
  };

  return <Skeleton width={width} height={heights[size]} variant="rounded" />;
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: "200%",
  },
  gradient: {
    flex: 1,
  },
  textContainer: {
    gap: tokens.spacing.xs,
  },
  card: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  cardHeaderText: {
    flex: 1,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  listItemText: {
    flex: 1,
  },
});
