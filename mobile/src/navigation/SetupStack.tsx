import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { AccessibilityModeSetupScreen } from "../screens/AccessibilityModeSetupScreen";

export type SetupStackParamList = {
  AccessibilityModeSetup: undefined;
};

const Stack = createNativeStackNavigator<SetupStackParamList>();

export function SetupStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccessibilityModeSetup" component={AccessibilityModeSetupScreen} />
    </Stack.Navigator>
  );
}

