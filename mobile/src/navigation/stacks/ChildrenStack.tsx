import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAccessibility } from "../../accessibility/AccessibilityProvider";

// Screens
import { ChildListScreen } from "../../screens/ChildListScreen";
import { ChildDetailScreen } from "../../screens/ChildDetailScreen";
import { CreateChildScreen } from "../../screens/CreateChildScreen";
import { AddUpdateScreen } from "../../screens/AddUpdateScreen";
import { UploadMediaScreen } from "../../screens/UploadMediaScreen";
import { ApprovalsScreen } from "../../screens/ApprovalsScreen";
import { AssignFacilitatorScreen } from "../../screens/AssignFacilitatorScreen";

export type ChildrenStackParamList = {
  ChildList: undefined;
  Child: { childId: string };
  CreateChild: undefined;
  AddUpdate: { childId: string };
  UploadMedia: { childId: string };
  Approvals: { childId: string };
  AssignFacilitator: { childId: string };
};

const Stack = createNativeStackNavigator<ChildrenStackParamList>();

export function ChildrenStack() {
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
        name="ChildList"
        component={ChildListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Child"
        component={ChildDetailScreen}
        options={{ title: "Child Profile" }}
      />
      <Stack.Screen
        name="CreateChild"
        component={CreateChildScreen}
        options={{ title: "Add Child" }}
      />
      <Stack.Screen
        name="AddUpdate"
        component={AddUpdateScreen}
        options={{ title: "Add Progress Update" }}
      />
      <Stack.Screen
        name="UploadMedia"
        component={UploadMediaScreen}
        options={{ title: "Upload Media" }}
      />
      <Stack.Screen
        name="Approvals"
        component={ApprovalsScreen}
        options={{ title: "Pending Approvals" }}
      />
      <Stack.Screen
        name="AssignFacilitator"
        component={AssignFacilitatorScreen}
        options={{ title: "Assign Facilitator" }}
      />
    </Stack.Navigator>
  );
}
