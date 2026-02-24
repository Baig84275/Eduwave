import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  StyleProp,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  Pressable,
  StyleSheet,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  interpolateColor,
  Easing,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "./Text";
import { tokens } from "../theme/tokens";
import { useShakeAnimation, haptics } from "../animation";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  helperText?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showClearButton?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
  floatingLabel?: boolean;
  variant?: "default" | "filled" | "outlined";
}

export function TextField({
  label,
  error,
  helperText,
  containerStyle,
  leftIcon,
  rightIcon,
  showClearButton = false,
  maxLength,
  showCharacterCount = false,
  floatingLabel = true,
  variant = "default",
  value,
  onChangeText,
  placeholder: placeholderProp,
  ...inputProps
}: TextFieldProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const reduceMotion = config.motion.reduceMotion;
  const inputRef = useRef<TextInput>(null);

  const [focused, setFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value ?? "");

  // Sync internal value with prop
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const hasValue = Boolean(internalValue && internalValue.length > 0);
  const characterCount = internalValue?.length ?? 0;

  // Animation values
  const focusProgress = useSharedValue(hasValue ? 1 : 0);
  const borderColorProgress = useSharedValue(0);
  const { shake, animatedStyle: shakeStyle } = useShakeAnimation();

  // Handle focus/blur animations
  useEffect(() => {
    const shouldFloat = focused || hasValue;
    if (reduceMotion) {
      focusProgress.value = shouldFloat ? 1 : 0;
    } else {
      focusProgress.value = withSpring(shouldFloat ? 1 : 0, tokens.animation.spring.snappy);
    }
  }, [focused, hasValue, focusProgress, reduceMotion]);

  // Handle border color animation
  useEffect(() => {
    if (error) {
      borderColorProgress.value = reduceMotion ? 2 : withTiming(2, { duration: 200 });
      shake();
    } else if (focused) {
      borderColorProgress.value = reduceMotion ? 1 : withTiming(1, { duration: 200 });
    } else {
      borderColorProgress.value = reduceMotion ? 0 : withTiming(0, { duration: 200 });
    }
  }, [focused, error, borderColorProgress, reduceMotion, shake]);

  // Sizing
  const fontSize = Math.round(16 * config.typography.fontScale);
  const labelFontSize = Math.round(14 * config.typography.fontScale);
  const floatingLabelFontSize = Math.round(12 * config.typography.fontScale);
  const inputHeight = Math.max(tokens.components.input.height, config.interaction.minTouchSize);
  const paddingHorizontal = tokens.components.input.paddingHorizontal;

  // Animated styles for floating label
  const floatingLabelStyle = useAnimatedStyle(() => {
    if (!floatingLabel) {
      return {};
    }

    const translateY = interpolate(focusProgress.value, [0, 1], [0, -inputHeight / 2 - 2]);
    const scale = interpolate(focusProgress.value, [0, 1], [1, 0.85]);

    return {
      transform: [{ translateY }, { scale }],
    };
  });

  // Animated styles for border
  const borderAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      borderColorProgress.value,
      [0, 1, 2],
      [colors.border, colors.focusRing, colors.danger]
    );

    const borderWidth = interpolate(borderColorProgress.value, [0, 1, 2], [1, 2, 2]);

    return {
      borderColor,
      borderWidth,
    };
  });

  // Platform check must live outside the worklet (Platform.select is not a worklet function)
  const isIos = Platform.OS === "ios";

  // Animated glow effect for focus
  const glowStyle = useAnimatedStyle(() => {
    if (config.color.highContrast || !isIos) {
      return {};
    }

    const shadowOpacity = interpolate(focusProgress.value, [0, 1], [0, 0.15]);
    const shadowRadius = interpolate(focusProgress.value, [0, 1], [0, 8]);

    return {
      shadowColor: error ? colors.danger : colors.focusRing,
      shadowOpacity,
      shadowRadius,
      shadowOffset: { width: 0, height: 0 },
    };
  });

  // Get background based on variant
  const getBackground = () => {
    switch (variant) {
      case "filled":
        return focused ? colors.surface : colors.surfaceAlt;
      case "outlined":
        return "transparent";
      default:
        return colors.surface;
    }
  };

  // Handlers
  const handleChangeText = useCallback(
    (text: string) => {
      setInternalValue(text);
      onChangeText?.(text);
    },
    [onChangeText]
  );

  const handleClear = useCallback(() => {
    haptics.light();
    setInternalValue("");
    onChangeText?.("");
    inputRef.current?.focus();
  }, [onChangeText]);

  const handleContainerPress = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const a11yLabel = useMemo(
    () => inputProps.accessibilityLabel ?? label,
    [inputProps.accessibilityLabel, label]
  );
  const a11yHint = useMemo(
    () => inputProps.accessibilityHint ?? placeholderProp,
    [inputProps.accessibilityHint, placeholderProp]
  );

  // Shadow for default variant
  const shadow =
    config.color.highContrast || variant === "outlined"
      ? {}
      : Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
          },
          android: {
            elevation: 1,
          },
          default: {},
        });

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Non-floating label */}
      {!floatingLabel && (
        <AppText variant="label" weight="semibold" style={styles.staticLabel}>
          {label}
        </AppText>
      )}

      <Pressable onPress={handleContainerPress}>
        <Animated.View
          style={[
            styles.inputContainer,
            {
              minHeight: inputHeight,
              backgroundColor: getBackground(),
              borderRadius: tokens.radius.lg,
              paddingLeft: leftIcon ? paddingHorizontal + 32 : paddingHorizontal,
              paddingRight:
                (showClearButton && hasValue) || rightIcon
                  ? paddingHorizontal + 32
                  : paddingHorizontal,
            },
            shadow as object,
            borderAnimatedStyle,
            glowStyle,
            shakeStyle,
          ]}
        >
          {/* Left Icon */}
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

          {/* Floating Label */}
          {floatingLabel && (
            <Animated.View style={[styles.floatingLabelContainer, floatingLabelStyle]}>
              <Animated.Text
                style={[
                  styles.floatingLabel,
                  {
                    fontSize: hasValue || focused ? floatingLabelFontSize : labelFontSize,
                    color: error
                      ? colors.danger
                      : focused
                        ? colors.primary
                        : colors.textMuted,
                    backgroundColor: getBackground(),
                    paddingHorizontal: 4,
                  },
                ]}
              >
                {label}
              </Animated.Text>
            </Animated.View>
          )}

          {/* Input */}
          <AnimatedTextInput
            ref={inputRef}
            value={internalValue}
            onChangeText={handleChangeText}
            // Only show placeholder once the floating label has moved up,
            // otherwise the label and placeholder text overlap
            placeholder={floatingLabel && !focused && !hasValue ? undefined : placeholderProp}
            placeholderTextColor={colors.textMuted}
            maxLength={maxLength}
            {...inputProps}
            accessibilityLabel={a11yLabel}
            accessibilityHint={a11yHint}
            onFocus={(e) => {
              setFocused(true);
              inputProps.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              inputProps.onBlur?.(e);
            }}
            style={[
              styles.input,
              {
                color: colors.text,
                fontSize,
                letterSpacing: config.typography.letterSpacing,
                paddingTop: floatingLabel && (hasValue || focused) ? 8 : 0,
              },
              inputProps.style,
            ]}
          />

          {/* Clear Button */}
          {showClearButton && hasValue && !inputProps.editable !== false && (
            <Pressable
              onPress={handleClear}
              style={styles.rightIcon}
              accessibilityRole="button"
              accessibilityLabel="Clear input"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          )}

          {/* Right Icon */}
          {rightIcon && !showClearButton && <View style={styles.rightIcon}>{rightIcon}</View>}
        </Animated.View>
      </Pressable>

      {/* Footer: Error, Helper Text, Character Count */}
      <View style={styles.footer}>
        <View style={styles.footerText}>
          {error ? (
            <AppText variant="caption" tone="danger" weight="semibold">
              {error}
            </AppText>
          ) : helperText ? (
            <AppText variant="caption" tone="muted">
              {helperText}
            </AppText>
          ) : null}
        </View>

        {showCharacterCount && maxLength && (
          <AppText
            variant="caption"
            tone={characterCount >= maxLength ? "danger" : "muted"}
            style={styles.characterCount}
          >
            {characterCount}/{maxLength}
          </AppText>
        )}
      </View>
    </View>
  );
}

/**
 * Search-specific TextField variant
 */
export function SearchField({
  placeholder = "Search...",
  onSearch,
  ...props
}: Omit<TextFieldProps, "label" | "floatingLabel"> & {
  onSearch?: (query: string) => void;
}) {
  const { config } = useAccessibility();
  const colors = config.color.colors;

  return (
    <TextField
      label=""
      floatingLabel={false}
      placeholder={placeholder}
      variant="filled"
      showClearButton
      leftIcon={<MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />}
      returnKeyType="search"
      onSubmitEditing={(e) => onSearch?.(e.nativeEvent.text)}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.xs,
  },
  staticLabel: {
    marginBottom: tokens.spacing.xs,
  },
  inputContainer: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
  },
  floatingLabelContainer: {
    position: "absolute",
    left: tokens.components.input.paddingHorizontal,
    top: "50%",
    marginTop: -10,
  },
  floatingLabel: {
    fontWeight: "500",
  },
  leftIcon: {
    position: "absolute",
    left: tokens.components.input.paddingHorizontal,
    top: "50%",
    marginTop: -10,
  },
  rightIcon: {
    position: "absolute",
    right: tokens.components.input.paddingHorizontal,
    top: "50%",
    marginTop: -10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    minHeight: 18,
  },
  footerText: {
    flex: 1,
  },
  characterCount: {
    marginLeft: tokens.spacing.sm,
  },
});
