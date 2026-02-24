import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAccessibility } from "../../accessibility/AccessibilityProvider";
import { useAuth } from "../../auth/AuthContext";

// Screens
import { ChildListScreen } from "../../screens/ChildListScreen";
import { ChildDetailScreen } from "../../screens/ChildDetailScreen";
import { CreateChildScreen } from "../../screens/CreateChildScreen";
import { AddUpdateScreen } from "../../screens/AddUpdateScreen";
import { UploadMediaScreen } from "../../screens/UploadMediaScreen";
import { ApprovalsScreen } from "../../screens/ApprovalsScreen";
import { AssignFacilitatorScreen } from "../../screens/AssignFacilitatorScreen";
import { TrainerDashboardScreen } from "../../screens/TrainerDashboardScreen";
import { OrgOverviewScreen } from "../../screens/OrgOverviewScreen";
import { AssignTrainingScreen } from "../../screens/AssignTrainingScreen";

export type HomeStackParamList = {
  Dashboard: undefined;
  TrainerDashboard: undefined;
  OrgOverview: undefined;
  Child: { childId: string };
  CreateChild: undefined;
  AddUpdate: { childId: string };
  UploadMedia: { childId: string };
  Approvals: { childId: string };
  AssignFacilitator: { childId: string };
  AssignTraining: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  const { config } = useAccessibility();
  const { session } = useAuth();
  const colors = config.color.colors;

  const userRole = session?.user?.role;

  const getInitialScreen = (): keyof HomeStackParamList => {
    switch (userRole) {
      case "TRAINER_SUPERVISOR":
        return "TrainerDashboard";
      case "ORG_ADMIN":
        return "OrgOverview";
      default:
        return "Dashboard";
    }
  };

  return (
    <Stack.Navigator
      initialRouteName={getInitialScreen()}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: "600" },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={ChildListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TrainerDashboard"
        component={TrainerDashboardScreen}
        options={{ title: "Dashboard", headerShown: false }}
      />
      <Stack.Screen
        name="OrgOverview"
        component={OrgOverviewScreen}
        options={{ title: "Organization", headerShown: false }}
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
      <Stack.Screen
        name="AssignTraining"
        component={AssignTrainingScreen}
        options={{ title: "Assign Training" }}
      />
    </Stack.Navigator>
  );
}
