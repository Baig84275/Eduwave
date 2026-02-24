import React from "react";
import { View, StyleSheet, Pressable, AccessibilityInfo, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  SlideInUp,
  SlideOutUp,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "./Text";
import { tokens } from "../theme/tokens";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const ICON_MAP: Record<ToastType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  success: "check-circle",
  error: "alert-circle",
  warning: "alert",
  info: "information",
};

export function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const reduceMotion = config.motion.reduceMotion;
  const insets = useSafeAreaInsets();

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Get color based on toast type
  const getTypeColor = () => {
    switch (toast.type) {
      case "success":
        return colors.success;
      case "error":
        return colors.danger;
      case "warning":
        return colors.warning;
      case "info":
        return colors.info;
      default:
        return colors.primary;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case "success":
        return colors.successLight;
      case "error":
        return colors.dangerLight;
      case "warning":
        return colors.warningLight;
      case "info":
        return colors.infoLight;
      default:
        return colors.surfaceAlt;
    }
  };

  const typeColor = getTypeColor();
  const backgroundColor = getBackgroundColor();

  // Swipe to dismiss gesture
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      opacity.value = 1 - Math.abs(event.translationX) / 200;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 100) {
        translateX.value = withTiming(event.translationX > 0 ? 400 : -400, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDismiss)(toast.id);
        });
      } else {
        translateX.value = withSpring(0, tokens.animation.spring.snappy);
        opacity.value = withSpring(1, tokens.animation.spring.snappy);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  // Announce to screen readers
  React.useEffect(() => {
    const announcement = `${toast.type}: ${toast.title}${toast.message ? `. ${toast.message}` : ""}`;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [toast]);

  const content = (
    <Animated.View
      entering={reduceMotion ? FadeIn.duration(100) : SlideInUp.springify()}
      exiting={reduceMotion ? FadeOut.duration(100) : SlideOutUp.duration(200)}
      style={[
        styles.toastContainer,
        {
          marginTop: insets.top + tokens.spacing.sm,
          backgroundColor,
          borderLeftColor: typeColor,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.toastContent, animatedStyle]}>
          <View style={[styles.iconContainer, { backgroundColor: typeColor }]}>
            <MaterialCommunityIcons name={ICON_MAP[toast.type]} size={20} color="#FFFFFF" />
          </View>

          <View style={styles.textContainer}>
            <AppText variant="body" weight="semibold" style={{ color: colors.text }}>
              {toast.title}
            </AppText>
            {toast.message && (
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {toast.message}
              </AppText>
            )}
          </View>

          {toast.action && (
            <Pressable
              onPress={toast.action.onPress}
              style={[styles.actionButton, { borderColor: typeColor }]}
              accessibilityRole="button"
              accessibilityLabel={toast.action.label}
            >
              <AppText variant="label" weight="semibold" style={{ color: typeColor }}>
                {toast.action.label}
              </AppText>
            </Pressable>
          )}

          <Pressable
            onPress={() => onDismiss(toast.id)}
            style={styles.dismissButton}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );

  // Use BlurView on iOS for glass effect
  if (Platform.OS === "ios" && !config.color.highContrast) {
    return (
      <Animated.View
        entering={reduceMotion ? FadeIn.duration(100) : SlideInUp.springify()}
        exiting={reduceMotion ? FadeOut.duration(100) : SlideOutUp.duration(200)}
        style={[
          styles.toastContainer,
          {
            marginTop: insets.top + tokens.spacing.sm,
            borderLeftColor: typeColor,
            backgroundColor: "transparent",
            overflow: "hidden",
          },
        ]}
      >
        <BlurView intensity={80} tint="light" style={styles.blurBackground}>
          <View style={[styles.blurOverlay, { backgroundColor }]} />
        </BlurView>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.toastContent, animatedStyle]}>
            <View style={[styles.iconContainer, { backgroundColor: typeColor }]}>
              <MaterialCommunityIcons name={ICON_MAP[toast.type]} size={20} color="#FFFFFF" />
            </View>

            <View style={styles.textContainer}>
              <AppText variant="body" weight="semibold" style={{ color: colors.text }}>
                {toast.title}
              </AppText>
              {toast.message && (
                <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                  {toast.message}
                </AppText>
              )}
            </View>

            {toast.action && (
              <Pressable
                onPress={toast.action.onPress}
                style={[styles.actionButton, { borderColor: typeColor }]}
              >
                <AppText variant="label" weight="semibold" style={{ color: typeColor }}>
                  {toast.action.label}
                </AppText>
              </Pressable>
            )}

            <Pressable
              onPress={() => onDismiss(toast.id)}
              style={styles.dismissButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  toastContainer: {
    marginHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 6,
      },
    }),
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  actionButton: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  dismissButton: {
    padding: tokens.spacing.xs,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.85,
  },
});
