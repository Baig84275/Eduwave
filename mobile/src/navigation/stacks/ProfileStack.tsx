import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAccessibility } from "../../accessibility/AccessibilityProvider";

// Screens
import { ProfileScreen } from "../../screens/ProfileScreen";
import { AccessibilitySettingsScreen } from "../../screens/AccessibilitySettingsScreen";
import { AdminDashboardScreen } from "../../screens/AdminDashboardScreen";
import { CheckInScreen } from "../../screens/CheckInScreen";
import { FacilitatorJourneyScreen } from "../../screens/FacilitatorJourneyScreen";
import { SupervisionLogsScreen } from "../../screens/SupervisionLogsScreen";
import { CreateSupervisionLogScreen } from "../../screens/CreateSupervisionLogScreen";
import { SupervisionFollowUpScreen } from "../../screens/SupervisionFollowUpScreen";
import { InvitationsScreen } from "../../screens/InvitationsScreen";
import { MainInviteLinkScreen } from "../../screens/MainInviteLinkScreen";

export type ProfileStackParamList = {
  Profile: undefined;
  Accessibility: undefined;
  Admin: undefined;
  CheckIn: undefined;
  Journey: undefined;
  SupervisionLogs: undefined;
  CreateSupervisionLog: undefined;
  SupervisionFollowUp: { logId: string };
  Invitations: undefined;
  Invite: { token: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
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
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Accessibility"
        component={AccessibilitySettingsScreen}
        options={{ title: "Accessibility Settings" }}
      />
      <Stack.Screen
        name="Admin"
        component={AdminDashboardScreen}
        options={{ title: "Admin Dashboard" }}
      />
      <Stack.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{ title: "Daily Check-In" }}
      />
      <Stack.Screen
        name="Journey"
        component={FacilitatorJourneyScreen}
        options={{ title: "My Journey" }}
      />
      <Stack.Screen
        name="SupervisionLogs"
        component={SupervisionLogsScreen}
        options={{ title: "Supervision Logs" }}
      />
      <Stack.Screen
        name="CreateSupervisionLog"
        component={CreateSupervisionLogScreen}
        options={{ title: "New Supervision Log" }}
      />
      <Stack.Screen
        name="SupervisionFollowUp"
        component={SupervisionFollowUpScreen}
        options={{ title: "Follow-Up" }}
      />
      <Stack.Screen
        name="Invitations"
        component={InvitationsScreen}
        options={{ title: "Invitations" }}
      />
      <Stack.Screen
        name="Invite"
        component={MainInviteLinkScreen}
        options={{ title: "Accept Invitation" }}
      />
    </Stack.Navigator>
  );
}
