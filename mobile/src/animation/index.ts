/**
 * Animation System
 * Provides animation utilities and hooks that respect accessibility settings
 */

import { useCallback, useEffect } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
  SharedValue,
  AnimatedStyle,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { tokens } from "../theme/tokens";

// Types
export type SpringConfig = {
  damping: number;
  stiffness: number;
  mass?: number;
};

export type AnimationConfig = {
  duration: number;
  reduceMotion: boolean;
  spring: SpringConfig;
};

/**
 * Hook to get animation configuration based on accessibility settings
 */
export function useAnimationConfig(): AnimationConfig {
  const { config } = useAccessibility();
  const reduceMotion = config.motion.reduceMotion;

  return {
    duration: reduceMotion ? 0 : tokens.animation.normal,
    reduceMotion,
    spring: reduceMotion
      ? { damping: 100, stiffness: 1000 } // Instant spring
      : tokens.animation.spring.snappy,
  };
}

/**
 * Hook for press/scale animations on interactive elements
 */
export function usePressAnimation(scaleValue = 0.97) {
  const { config } = useAccessibility();
  const reduceMotion = config.motion.reduceMotion;
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    if (reduceMotion) {
      scale.value = scaleValue;
    } else {
      scale.value = withSpring(scaleValue, tokens.animation.spring.snappy);
    }
  }, [reduceMotion, scale, scaleValue]);

  const onPressOut = useCallback(() => {
    if (reduceMotion) {
      scale.value = 1;
    } else {
      scale.value = withSpring(1, tokens.animation.spring.snappy);
    }
  }, [reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { onPressIn, onPressOut, animatedStyle, scale };
}

/**
 * Hook for fade animations
 */
export function useFadeAnimation(initialValue = 0) {
  const { config } = useAccessibility();
  const reduceMotion = config.motion.reduceMotion;
  const opacity = useSharedValue(initialValue);

  const fadeIn = useCallback(
    (duration = tokens.animation.normal, delay = 0) => {
      if (reduceMotion) {
        opacity.value = 1;
      } else {
        opacity.value = withDelay(
          delay,
          withTiming(1, { duration, easing: Easing.out(Easing.ease) })
        );
      }
    },
    [reduceMotion, opacity]
  );

  const fadeOut = useCallback(
    (duration = tokens.animation.normal, delay = 0) => {
      if (reduceMotion) {
        opacity.value = 0;
      } else {
        opacity.value = withDelay(
          delay,
          withTiming(0, { duration, easing: Easing.in(Easing.ease) })
        );
      }
    },
    [reduceMotion, opacity]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return { fadeIn, fadeOut, animatedStyle, opacity };
}

/**
 * Hook for slide animations
 */
export function useSlideAnimation(
  direction: "up" | "down" | "left" | "right" = "up",
  distance = 20
) {
  const { config } = useAccessibility();
  const reduceMotion = config.motion.reduceMotion;
  const progress = useSharedValue(0);

  const slideIn = useCallback(
    (duration = tokens.animation.normal, delay = 0) => {
      if (reduceMotion) {
        progress.value = 1;
      } else {
        progress.value = withDelay(
          delay,
          withSpring(1, tokens.animation.spring.snappy)
        );
      }
    },
    [reduceMotion, progress]
  );

  const slideOut = useCallback(
    (duration = tokens.animation.normal, delay = 0) => {
      if (reduceMotion) {
        progress.value = 0;
      } else {
        progress.value = withDelay(
          delay,
          withTiming(0, { duration, easing: Easing.in(Easing.ease) })
        );
      }
    },
    [reduceMotion, progress]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const translateX =
      direction === "left"
        ? interpolate(progress.value, [0, 1], [-distance, 0])
        : direction === "right"
          ? interpolate(progress.value, [0, 1], [distance, 0])
          : 0;

    const translateY =
      direction === "up"
        ? interpolate(progress.value, [0, 1], [distance, 0])
        : direction === "down"
          ? interpolate(progress.value, [0, 1], [-distance, 0])
          : 0;

    return {
      opacity: progress.value,
      transform: [{ translateX }, { translateY }],
    };
  });

  return { slideIn, slideOut, animatedStyle, progress };
}

/**
 * Hook for shake animation (used for errors)
 */
export function useShakeAnimation() {
  const { config } = useAccessibility();
  const reduceMotion = config.motion.reduceMotion;
  const translateX = useSharedValue(0);

  const shake = useCallback(() => {
    if (reduceMotion) {
      // Just trigger haptic for feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    translateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [reduceMotion, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { shake, animatedStyle };
}

/**
 * Hook for staggered list animations
 */
export function useStaggerAnimation(itemCount: number, staggerDelay = 50) {
  const { config } = useAccessibility();
  const reduceMotion = config.motion.reduceMotion;

  const getItemAnimatedStyle = useCallback(
    (index: number, progress: SharedValue<number>) => {
      "worklet";
      const delay = index * staggerDelay;
      const itemProgress = interpolate(
        progress.value,
        [delay / 1000, (delay + 300) / 1000],
        [0, 1],
        Extrapolation.CLAMP
      );

      if (reduceMotion) {
        return {
          opacity: progress.value > 0 ? 1 : 0,
        };
      }

      return {
        opacity: itemProgress,
        transform: [
          {
            translateY: interpolate(itemProgress, [0, 1], [20, 0]),
          },
        ],
      };
    },
    [reduceMotion, staggerDelay]
  );

  return { getItemAnimatedStyle };
}

/**
 * Hook for pulse animation (used for loading states)
 */
export function usePulseAnimation() {
  const { config } = useAccessibility();
  const reduceMotion = config.motion.reduceMotion;
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;

    const pulse = () => {
      opacity.value = withSequence(
        withTiming(0.5, { duration: 800 }),
        withTiming(1, { duration: 800 })
      );
    };

    pulse();
    const interval = setInterval(pulse, 1600);
    return () => clearInterval(interval);
  }, [reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.7 : opacity.value,
  }));

  return { animatedStyle };
}

/**
 * Haptic feedback utilities
 */
export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  selection: () => Haptics.selectionAsync(),
};

/**
 * Create a delayed callback for use with animations
 */
export function createAnimatedCallback(callback: () => void, delay: number) {
  "worklet";
  runOnJS(setTimeout)(() => callback(), delay);
}
