import React, { useCallback } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "./Text";
import { tokens } from "../theme/tokens";
import { haptics } from "../animation";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface TabConfig {
  name: string;
  label: string;
  icon: IconName;
  iconFocused: IconName;
  badge?: number;
}

const TAB_CONFIGS: Record<string, TabConfig> = {
  HomeTab: {
    name: "HomeTab",
    label: "Home",
    icon: "home-outline",
    iconFocused: "home",
  },
  ChildrenTab: {
    name: "ChildrenTab",
    label: "Children",
    icon: "account-group-outline",
    iconFocused: "account-group",
  },
  TrainingTab: {
    name: "TrainingTab",
    label: "Training",
    icon: "book-open-outline",
    iconFocused: "book-open",
  },
  ResourcesTab: {
    name: "ResourcesTab",
    label: "Resources",
    icon: "map-marker-outline",
    iconFocused: "map-marker",
  },
  CoursesTab: {
    name: "CoursesTab",
    label: "Courses",
    icon: "school-outline",
    iconFocused: "school",
  },
  ProfileTab: {
    name: "ProfileTab",
    label: "Profile",
    icon: "account-outline",
    iconFocused: "account",
  },
};

function TabBarItem({
  route,
  focused,
  onPress,
  onLongPress,
  badge,
}: {
  route: { key: string; name: string };
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  badge?: number;
}) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const reduceMotion = config.motion.reduceMotion;

  const tabConfig = TAB_CONFIGS[route.name] || {
    label: route.name,
    icon: "circle-outline" as IconName,
    iconFocused: "circle" as IconName,
  };

  const scale = useSharedValue(1);
  const focusProgress = useSharedValue(focused ? 1 : 0);

  // Update focus animation
  React.useEffect(() => {
    if (reduceMotion) {
      focusProgress.value = focused ? 1 : 0;
    } else {
      focusProgress.value = withSpring(focused ? 1 : 0, tokens.animation.spring.snappy);
    }
  }, [focused, focusProgress, reduceMotion]);

  const handlePressIn = useCallback(() => {
    haptics.selection();
    if (reduceMotion) {
      scale.value = 0.9;
    } else {
      scale.value = withSpring(0.9, tokens.animation.spring.snappy);
    }
  }, [reduceMotion, scale]);

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

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
    transform: [{ scaleX: interpolate(focusProgress.value, [0, 1], [0.5, 1]) }],
  }));

  const iconColor = focused ? colors.tabBarActive : colors.tabBarInactive;
  const icon = focused ? tabConfig.iconFocused : tabConfig.icon;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tabConfig.label}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.tabItemContent, animatedStyle]}>
        {/* Active indicator */}
        <Animated.View
          style={[
            styles.activeIndicator,
            { backgroundColor: colors.tabBarActive },
            indicatorStyle,
          ]}
        />

        {/* Icon with badge */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={icon}
            size={tokens.components.tabBar.iconSize}
            color={iconColor}
          />
          {badge !== undefined && badge > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <AppText
                variant="caption"
                weight="bold"
                style={{ color: "#FFFFFF", fontSize: 10 }}
              >
                {badge > 99 ? "99+" : badge}
              </AppText>
            </View>
          )}
        </View>

        {/* Label */}
        <AppText
          variant="caption"
          weight={focused ? "semibold" : "medium"}
          style={{
            color: iconColor,
            fontSize: tokens.components.tabBar.labelSize * config.typography.fontScale,
            marginTop: 2,
          }}
        >
          {tabConfig.label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const insets = useSafeAreaInsets();

  const tabBarHeight = tokens.components.tabBar.height + insets.bottom;

  // Render glass effect on iOS
  if (Platform.OS === "ios" && !config.color.highContrast) {
    return (
      <View style={[styles.container, { height: tabBarHeight }]}>
        <BlurView intensity={80} tint="light" style={styles.blurView}>
          <View
            style={[
              styles.blurOverlay,
              { backgroundColor: colors.tabBarBackground },
            ]}
          />
        </BlurView>
        <View
          style={[
            styles.tabBar,
            {
              borderTopColor: colors.tabBarBorder,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <TabBarItem
                key={route.key}
                route={route}
                focused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                badge={(options as any).tabBarBadge}
              />
            );
          })}
        </View>
      </View>
    );
  }

  // Default solid background
  return (
    <View
      style={[
        styles.container,
        styles.tabBar,
        {
          height: tabBarHeight,
          backgroundColor: colors.surface,
          borderTopColor: colors.tabBarBorder,
          paddingBottom: insets.bottom,
        },
        Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -4 },
          },
          android: {
            elevation: 8,
          },
        }),
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <TabBarItem
            key={route.key}
            route={route}
            focused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            badge={(options as any).tabBarBadge}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    paddingTop: tokens.spacing.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabItemContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: tokens.spacing.xs,
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    top: -tokens.spacing.xs,
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  iconContainer: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
});
