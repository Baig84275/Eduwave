/**
 * Animated Component Wrappers
 * Pre-built animated components for common UI patterns
 */

import React, { useEffect, useCallback } from "react";
import { ViewProps, PressableProps, Pressable, ViewStyle, StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInUp,
  SlideInLeft,
  SlideInRight,
  SlideOutDown,
  SlideOutUp,
  SlideOutLeft,
  SlideOutRight,
  Easing,
} from "react-native-reanimated";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { tokens } from "../theme/tokens";
import { haptics } from "./index";

// Types
type AnimatedPressableProps = PressableProps & {
  scaleOnPress?: number;
  enableHaptics?: boolean;
  hapticType?: "light" | "medium" | "selection";
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

type FadeInViewProps = ViewProps & {
  delay?: number;
  duration?: number;
  children: React.ReactNode;
};

type SlideInViewProps = ViewProps & {
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  distance?: number;
  children: React.ReactNode;
};

type ScaleInViewProps = ViewProps & {
  delay?: number;
  duration?: number;
  initialScale?: number;
  children: React.ReactNode;
};

/**
 * Animated Pressable with scale and haptic feedback
 */
export function AnimatedPressable({
  scaleOnPress = 0.97,
  enableHaptics = true,
  hapticType = "light",
  onPressIn,
  onPressOut,
  onPress,
  children,
  style,
  disabled,
  ...props
}: AnimatedPressableProps) {
  const { config } = useAccessibility();
  const reduceMotion = config.motion.reduceMotion;
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(
    (e: any) => {
      if (enableHaptics) {
        haptics[hapticType]();
      }
      if (reduceMotion) {
        scale.value = scaleOnPress;
      } else {
        scale.value = withSpring(scaleOnPress, tokens.animation.spring.snappy);
      }
      onPressIn?.(e);
    },
    [enableHaptics, hapticType, reduceMotion, scale, scaleOnPress, onPressIn]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      if (reduceMotion) {
        scale.value = 1;
      } else {
        scale.value = withSpring(1, tokens.animation.spring.snappy);
      }
      onPressOut?.(e);
    },
    [reduceMotion, scale, onPressOut]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * View that fades in on mount.
 * Uses useSharedValue + useAnimatedStyle (worklets only, no native layout animation APIs).
 * This avoids crashes caused by JS/native reanimated version mismatches.
 */
export function FadeInView({
  delay = 0,
  duration = tokens.animation.fast,
  children,
  style,
  ...props
}: FadeInViewProps) {
  const { config } = useAccessibility();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (config.motion.reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.ease) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[style, animatedStyle]} {...props}>
      {children}
    </Animated.View>
  );
}

/**
 * View that fades in with a subtle delay.
 * Uses useSharedValue + useAnimatedStyle (worklets only, no native layout animation APIs).
 */
export function SlideInView({
  delay = 0,
  duration = tokens.animation.fast,
  children,
  style,
  ...props
}: SlideInViewProps) {
  const { config } = useAccessibility();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (config.motion.reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.ease) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[style, animatedStyle]} {...props}>
      {children}
    </Animated.View>
  );
}

/**
 * View that scales in on mount
 */
export function ScaleInView({
  delay = 0,
  duration = tokens.animation.normal,
  initialScale = 0.9,
  children,
  style,
  ...props
}: ScaleInViewProps) {
  const { config } = useAccessibility();
  const reduceMotion = config.motion.reduceMotion;
  const scale = useSharedValue(reduceMotion ? 1 : initialScale);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }
    scale.value = withDelay(delay, withSpring(1, tokens.animation.spring.snappy));
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.ease) })
    );
  }, [delay, duration, opacity, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]} {...props}>
      {children}
    </Animated.View>
  );
}

/**
 * Staggered list item — subtle fade only, no translation.
 * Uses useSharedValue + useAnimatedStyle (worklets only, no native layout animation APIs).
 */
export function StaggeredItem({
  index,
  staggerDelay = 30,
  children,
  style,
  ...props
}: ViewProps & { index: number; staggerDelay?: number; children: React.ReactNode }) {
  const { config } = useAccessibility();
  const opacity = useSharedValue(0);
  const delay = index * staggerDelay;

  useEffect(() => {
    if (config.motion.reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[style, animatedStyle]} {...props}>
      {children}
    </Animated.View>
  );
}

/**
 * Layout transition wrapper (for add/remove animations).
 * Uses useSharedValue (no entering/exiting/layout props that require native support).
 */
export function AnimatedLayoutView({
  children,
  style,
  ...props
}: ViewProps & { children: React.ReactNode }) {
  const { config } = useAccessibility();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: config.motion.reduceMotion ? 0 : 200,
      easing: Easing.out(Easing.ease),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[style, animatedStyle]} {...props}>
      {children}
    </Animated.View>
  );
}

/**
 * Pre-configured entering/exiting animations
 * Use these with Animated.View's entering/exiting props
 */
export const enteringAnimations = {
  fadeIn: FadeIn.duration(300),
  fadeInFast: FadeIn.duration(150),
  slideUp: SlideInDown.duration(300).springify(),
  slideDown: SlideInUp.duration(300).springify(),
  slideLeft: SlideInRight.duration(300).springify(),
  slideRight: SlideInLeft.duration(300).springify(),
};

export const exitingAnimations = {
  fadeOut: FadeOut.duration(200),
  fadeOutFast: FadeOut.duration(100),
  slideUp: SlideOutUp.duration(200),
  slideDown: SlideOutDown.duration(200),
  slideLeft: SlideOutLeft.duration(200),
  slideRight: SlideOutRight.duration(200),
};

/**
 * Create delayed entering animation
 */
export function createDelayedEntering(animation: typeof FadeIn, delayMs: number) {
  return animation.delay(delayMs);
}
