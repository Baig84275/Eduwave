import React, { useCallback } from "react";
import { View, Image, StyleSheet, Pressable, ImageSourcePropType } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "./Text";
import { tokens } from "../theme/tokens";
import { haptics } from "../animation";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
type AvatarStatus = "online" | "offline" | "busy" | "away";

export interface AvatarProps {
  source?: ImageSourcePropType | null;
  name?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  badge?: number;
  pressable?: boolean;
  onPress?: () => void;
  showGradientBorder?: boolean;
}

const STATUS_COLORS: Record<AvatarStatus, string> = {
  online: "#22C55E",
  offline: "#94A3B8",
  busy: "#EF4444",
  away: "#F59E0B",
};

export function Avatar({
  source,
  name,
  size = "md",
  status,
  badge,
  pressable = false,
  onPress,
  showGradientBorder = false,
}: AvatarProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const reduceMotion = config.motion.reduceMotion;

  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    if (!pressable) return;
    haptics.light();
    if (reduceMotion) {
      scale.value = 0.95;
    } else {
      scale.value = withSpring(0.95, tokens.animation.spring.snappy);
    }
  }, [pressable, reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    if (!pressable) return;
    if (reduceMotion) {
      scale.value = 1;
    } else {
      scale.value = withSpring(1, tokens.animation.spring.snappy);
    }
  }, [pressable, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Get size values
  const sizeValue = tokens.components.avatar.sizes[size];
  const fontSize = sizeValue * 0.4;
  const statusSize = Math.max(sizeValue * 0.25, 10);
  const badgeSize = Math.max(sizeValue * 0.4, 18);

  // Generate initials from name
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Generate consistent color from name
  const getColorFromName = (n: string): [string, string] => {
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    const GRADIENTS: [string, string][] = [
      ["#007B8A", "#005F6B"],
      ["#3A9E6F", "#2A7E52"],
      ["#6B4FA0", "#4A2E7A"],
      ["#F4861E", "#C4680F"],
      ["#555555", "#888888"],
    ];
    return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
  };

  const initials = name ? getInitials(name) : "?";
  const gradientColors: [string, string] = name ? getColorFromName(name) : ["#555555", "#888888"];

  const avatarContent = (
    <View style={[styles.container, { width: sizeValue, height: sizeValue }]}>
      {/* Gradient border */}
      {showGradientBorder && (
        <LinearGradient
          colors={[colors.gradientStart || "#007B8A", colors.gradientEnd || "#005F6B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradientBorder,
            {
              width: sizeValue + 4,
              height: sizeValue + 4,
              borderRadius: (sizeValue + 4) / 2,
            },
          ]}
        />
      )}

      {/* Avatar content */}
      {source ? (
        <Image
          source={source}
          style={[
            styles.image,
            {
              width: sizeValue,
              height: sizeValue,
              borderRadius: sizeValue / 2,
            },
          ]}
          accessibilityLabel={name ? `${name}'s avatar` : "Avatar"}
        />
      ) : (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.initialsContainer,
            {
              width: sizeValue,
              height: sizeValue,
              borderRadius: sizeValue / 2,
            },
          ]}
        >
          <AppText
            variant="body"
            weight="bold"
            style={{
              color: "#FFFFFF",
              fontSize: fontSize * config.typography.fontScale,
            }}
          >
            {initials}
          </AppText>
        </LinearGradient>
      )}

      {/* Status indicator */}
      {status && (
        <View
          style={[
            styles.statusIndicator,
            {
              width: statusSize,
              height: statusSize,
              borderRadius: statusSize / 2,
              backgroundColor: STATUS_COLORS[status],
              borderColor: colors.surface,
              right: 0,
              bottom: 0,
            },
          ]}
          accessibilityLabel={`Status: ${status}`}
        />
      )}

      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <View
          style={[
            styles.badge,
            {
              minWidth: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: colors.danger,
              borderColor: colors.surface,
              right: -4,
              top: -4,
            },
          ]}
          accessibilityLabel={`${badge} notifications`}
        >
          <AppText
            variant="caption"
            weight="bold"
            style={{ color: "#FFFFFF", fontSize: badgeSize * 0.6 }}
          >
            {badge > 99 ? "99+" : badge}
          </AppText>
        </View>
      )}
    </View>
  );

  if (pressable && onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={name ? `${name}'s avatar` : "Avatar"}
      >
        <Animated.View style={animatedStyle}>{avatarContent}</Animated.View>
      </Pressable>
    );
  }

  return avatarContent;
}

/**
 * Avatar Group - displays multiple avatars stacked
 */
export function AvatarGroup({
  avatars,
  max = 4,
  size = "md",
  onPress,
}: {
  avatars: Array<{ source?: ImageSourcePropType; name?: string }>;
  max?: number;
  size?: AvatarSize;
  onPress?: () => void;
}) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const sizeValue = tokens.components.avatar.sizes[size];
  const overlap = sizeValue * 0.3;

  const visibleAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.avatarGroup}
      accessibilityLabel={`${avatars.length} people`}
    >
      {visibleAvatars.map((avatar, index) => (
        <View
          key={index}
          style={[
            styles.avatarGroupItem,
            {
              marginLeft: index === 0 ? 0 : -overlap,
              zIndex: visibleAvatars.length - index,
            },
          ]}
        >
          <Avatar source={avatar.source} name={avatar.name} size={size} />
        </View>
      ))}

      {remaining > 0 && (
        <View
          style={[
            styles.avatarGroupItem,
            styles.remainingBadge,
            {
              marginLeft: -overlap,
              width: sizeValue,
              height: sizeValue,
              borderRadius: sizeValue / 2,
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.surface,
            },
          ]}
        >
          <AppText variant="caption" weight="bold" tone="muted">
            +{remaining}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  gradientBorder: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    resizeMode: "cover",
  },
  initialsContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  statusIndicator: {
    position: "absolute",
    borderWidth: 2,
  },
  badge: {
    position: "absolute",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  avatarGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarGroupItem: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 100,
  },
  remainingBadge: {
    alignItems: "center",
    justifyContent: "center",
  },
});
