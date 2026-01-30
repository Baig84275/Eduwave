import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ApprovalsScreen } from "../screens/ApprovalsScreen";
import { ChildDetailScreen } from "../screens/ChildDetailScreen";
import { ChildListScreen } from "../screens/ChildListScreen";
import { CreateChildScreen } from "../screens/CreateChildScreen";
import { AddUpdateScreen } from "../screens/AddUpdateScreen";
import { UploadMediaScreen } from "../screens/UploadMediaScreen";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AccessibilitySettingsScreen } from "../screens/AccessibilitySettingsScreen";
import { AdminDashboardScreen } from "../screens/AdminDashboardScreen";
import { AssignFacilitatorScreen } from "../screens/AssignFacilitatorScreen";

export type MainStackParamList = {
  Children: undefined;
  CreateChild: undefined;
  Child: { childId: string };
  AddUpdate: { childId: string };
  UploadMedia: { childId: string };
  Approvals: { childId: string };
  Accessibility: undefined;
  Admin: undefined;
  AssignFacilitator: { childId: string };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack() {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text }
      }}
    >
      <Stack.Screen name="Children" component={ChildListScreen} />
      <Stack.Screen name="CreateChild" component={CreateChildScreen} options={{ title: "Create Child" }} />
      <Stack.Screen name="Child" component={ChildDetailScreen} options={{ title: "Child Profile" }} />
      <Stack.Screen name="AddUpdate" component={AddUpdateScreen} options={{ title: "Add Update" }} />
      <Stack.Screen name="UploadMedia" component={UploadMediaScreen} options={{ title: "Upload Media" }} />
      <Stack.Screen name="Approvals" component={ApprovalsScreen} options={{ title: "Approvals" }} />
      <Stack.Screen name="Accessibility" component={AccessibilitySettingsScreen} options={{ title: "Accessibility" }} />
      <Stack.Screen name="Admin" component={AdminDashboardScreen} options={{ title: "Admin" }} />
      <Stack.Screen name="AssignFacilitator" component={AssignFacilitatorScreen} options={{ title: "Assign Facilitator" }} />
    </Stack.Navigator>
  );
}
