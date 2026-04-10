import { useCallback } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
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
  isSos?: boolean;
}

const TAB_CONFIGS: Record<string, TabConfig> = {
  HomeTab: {
    name: "HomeTab",
    label: "Home",
    icon: "home-outline",
    iconFocused: "home",
  },
  ResourcesTab: {
    name: "ResourcesTab",
    label: "Resources",
    icon: "map-marker-outline",
    iconFocused: "map-marker",
  },
  SosTab: {
    name: "SosTab",
    label: "SOS",
    icon: "phone-alert",
    iconFocused: "phone-alert",
    isSos: true,
  },
  TrackerTab: {
    name: "TrackerTab",
    label: "Tracker",
    icon: "chart-line",
    iconFocused: "chart-line",
  },
  LearnTab: {
    name: "LearnTab",
    label: "Learn",
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

function SosTabItem({
  focused,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    haptics.selection();
    scale.value = withSpring(0.9, tokens.animation.spring.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, tokens.animation.spring.snappy);
  }, [scale]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel="SOS Emergency"
      style={styles.sosWrapper}
    >
      <Animated.View
        style={[
          styles.sosButton,
          focused && styles.sosButtonFocused,
          animatedStyle,
        ]}
      >
        <MaterialCommunityIcons name="phone-alert" size={22} color="#fff" />
        <AppText variant="caption" weight="bold" style={styles.sosLabel}>
          SOS
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

function TabBarItem({
  route,
  focused,
  onPress,
  onLongPress,
}: {
  route: { key: string; name: string };
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
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

  const handlePressIn = useCallback(() => {
    haptics.selection();
    if (!reduceMotion) {
      scale.value = withSpring(0.88, tokens.animation.spring.snappy);
    }
  }, [reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    if (!reduceMotion) {
      scale.value = withSpring(1, tokens.animation.spring.snappy);
    }
  }, [reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
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
        {/* Active dot */}
        {focused && (
          <View style={[styles.activeDot, { backgroundColor: colors.tabBarActive }]} />
        )}
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={iconColor}
        />
        <AppText
          variant="caption"
          weight={focused ? "bold" : "medium"}
          style={{
            color: iconColor,
            fontSize: 8 * config.typography.fontScale,
            marginTop: 1,
            letterSpacing: 0.1,
          }}
        >
          {tabConfig.label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const insets = useSafeAreaInsets();
  const tabBarHeight = tokens.components.tabBar.height + insets.bottom;

  // Build per-route handlers
  const getHandlers = (route: { key: string; name: string }, index: number) => {
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
      navigation.emit({ type: "tabLongPress", target: route.key });
    };
    return { isFocused, onPress, onLongPress };
  };

  // Find SOS route info
  const sosIndex = state.routes.findIndex((r) => r.name === "SosTab");
  const sosHandlers = sosIndex >= 0 ? getHandlers(state.routes[sosIndex], sosIndex) : null;

  const renderItems = () =>
    state.routes.map((route, index) => {
      const { isFocused, onPress, onLongPress } = getHandlers(route, index);

      // Render a transparent spacer at the SOS slot so surrounding tabs share equal space
      if (route.name === "SosTab") {
        return <View key={route.key} style={styles.sosSpacer} />;
      }

      return (
        <TabBarItem
          key={route.key}
          route={route}
          focused={isFocused}
          onPress={onPress}
          onLongPress={onLongPress}
        />
      );
    });

  const sosButton = sosHandlers ? (
    <SosTabItem
      focused={sosHandlers.isFocused}
      onPress={sosHandlers.onPress}
      onLongPress={sosHandlers.onLongPress}
    />
  ) : null;

  const tabBarContent = (
    <>
      <View style={styles.tabBarStrip}>
        {renderItems()}
      </View>
      {/* SOS button pinned to horizontal center, raised above tab bar */}
      <View style={styles.sosCenterAnchor} pointerEvents="box-none">
        {sosButton}
      </View>
    </>
  );

  if (Platform.OS === "ios" && !config.color.highContrast) {
    return (
      <View style={[styles.container, { height: tabBarHeight }]}>
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBarBackground }]} />
        </BlurView>
        <View
          style={[
            styles.tabBar,
            { borderTopColor: colors.tabBarBorder, paddingBottom: insets.bottom },
          ]}
        >
          {tabBarContent}
        </View>
      </View>
    );
  }

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
          android: { elevation: 8 },
          ios: {
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -4 },
          },
        }),
      ]}
    >
      {tabBarContent}
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
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    paddingTop: 6,
    alignItems: "flex-end",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 4,
  },
  tabItemContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    position: "relative",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginBottom: 3,
  },
  sosSpacer: {
    flex: 1,
  },
  tabBarStrip: {
    flexDirection: "row",
    flex: 1,
    alignItems: "flex-end",
  },
  sosCenterAnchor: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  // SOS raised button
  sosWrapper: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 0,
  },
  sosButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    ...Platform.select({
      ios: {
        shadowColor: "#C62828",
        shadowOpacity: 0.55,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 10 },
    }),
  },
  sosButtonFocused: {
    backgroundColor: "#B71C1C",
  },
  sosLabel: {
    color: "#fff",
    fontSize: 7,
    marginTop: 1,
    letterSpacing: 0.3,
  },
});
