import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAccessibility } from "../../accessibility/AccessibilityProvider";

// Screens
import { ResourceDirectoryScreen } from "../../screens/ResourceDirectoryScreen";
import { ResourcesMapScreen } from "../../screens/ResourcesMapScreen";

export type ResourcesStackParamList = {
  ResourceDirectory: undefined;
  ResourcesMap: undefined;
};

const Stack = createNativeStackNavigator<ResourcesStackParamList>();

export function ResourcesStack() {
  const { config } = useAccessibility();
  const colors = config.color.colors;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: "600" },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="ResourceDirectory"
        component={ResourceDirectoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ResourcesMap"
        component={ResourcesMapScreen}
        options={{ title: "Map View" }}
      />
    </Stack.Navigator>
  );
}
