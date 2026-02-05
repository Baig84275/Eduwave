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
import { ResourceDirectoryScreen } from "../screens/ResourceDirectoryScreen";
import { CheckInScreen } from "../screens/CheckInScreen";
import { FacilitatorJourneyScreen } from "../screens/FacilitatorJourneyScreen";
import { TrainingHubScreen } from "../screens/TrainingHubScreen";
import { SupervisionLogsScreen } from "../screens/SupervisionLogsScreen";
import { CreateSupervisionLogScreen } from "../screens/CreateSupervisionLogScreen";
import { OrgOverviewScreen } from "../screens/OrgOverviewScreen";
import { TrainerDashboardScreen } from "../screens/TrainerDashboardScreen";
import { InvitationsScreen } from "../screens/InvitationsScreen";
import { MainInviteLinkScreen } from "../screens/MainInviteLinkScreen";
import { ResourcesMapScreen } from "../screens/ResourcesMapScreen";
import { TrainingReflectionFormScreen } from "../screens/TrainingReflectionFormScreen";
import { TrainingReflectionsScreen } from "../screens/TrainingReflectionsScreen";
import { SupervisionFollowUpScreen } from "../screens/SupervisionFollowUpScreen";
import { TrainingCoursesScreen } from "../screens/TrainingCoursesScreen";
import { AssignTrainingScreen } from "../screens/AssignTrainingScreen";

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
  AssignTraining: undefined;
  Resources: undefined;
  ResourcesMap: undefined;
  CheckIn: undefined;
  Journey: undefined;
  TrainingHub: undefined;
  TrainingCourses: undefined;
  TrainingReflections: undefined;
  TrainingReflection: { moduleId: string; courseId: string; moduleName: string };
  SupervisionLogs: undefined;
  SupervisionFollowUp: { logId: string };
  CreateSupervisionLog: undefined;
  OrgOverview: undefined;
  TrainerDashboard: undefined;
  Invitations: undefined;
  Invite: { token: string };
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
      <Stack.Screen name="Children" component={ChildListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateChild" component={CreateChildScreen} options={{ title: "Create Child" }} />
      <Stack.Screen name="Child" component={ChildDetailScreen} options={{ title: "Child Profile" }} />
      <Stack.Screen name="AddUpdate" component={AddUpdateScreen} options={{ title: "Add Update" }} />
      <Stack.Screen name="UploadMedia" component={UploadMediaScreen} options={{ title: "Upload Media" }} />
      <Stack.Screen name="Approvals" component={ApprovalsScreen} options={{ title: "Approvals" }} />
      <Stack.Screen name="Accessibility" component={AccessibilitySettingsScreen} options={{ title: "Accessibility" }} />
      <Stack.Screen name="Admin" component={AdminDashboardScreen} options={{ title: "Admin" }} />
      <Stack.Screen name="AssignFacilitator" component={AssignFacilitatorScreen} options={{ title: "Assign Facilitator" }} />
      <Stack.Screen name="Resources" component={ResourceDirectoryScreen} options={{ title: "Resources" }} />
      <Stack.Screen name="ResourcesMap" component={ResourcesMapScreen} options={{ title: "Resources Map" }} />
      <Stack.Screen name="CheckIn" component={CheckInScreen} options={{ title: "Check-In" }} />
      <Stack.Screen name="Journey" component={FacilitatorJourneyScreen} options={{ title: "My Journey" }} />
      <Stack.Screen name="TrainingHub" component={TrainingHubScreen} options={{ title: "Training" }} />
      <Stack.Screen name="TrainingCourses" component={TrainingCoursesScreen} options={{ title: "Training" }} />
      <Stack.Screen name="AssignTraining" component={AssignTrainingScreen} options={{ title: "Assign Training" }} />
      <Stack.Screen name="TrainingReflections" component={TrainingReflectionsScreen} options={{ title: "Training Journey" }} />
      <Stack.Screen name="TrainingReflection" component={TrainingReflectionFormScreen} options={{ title: "Add Reflection" }} />
      <Stack.Screen name="SupervisionLogs" component={SupervisionLogsScreen} options={{ title: "Supervision Logs" }} />
      <Stack.Screen name="SupervisionFollowUp" component={SupervisionFollowUpScreen} options={{ title: "Follow-Up" }} />
      <Stack.Screen
        name="CreateSupervisionLog"
        component={CreateSupervisionLogScreen}
        options={{ title: "Create Supervision Log" }}
      />
      <Stack.Screen name="OrgOverview" component={OrgOverviewScreen} options={{ title: "Org Overview" }} />
      <Stack.Screen name="TrainerDashboard" component={TrainerDashboardScreen} options={{ title: "Trainer Dashboard" }} />
      <Stack.Screen name="Invitations" component={InvitationsScreen} options={{ title: "Invitations" }} />
      <Stack.Screen name="Invite" component={MainInviteLinkScreen} options={{ title: "Invitation" }} />
    </Stack.Navigator>
  );
}
