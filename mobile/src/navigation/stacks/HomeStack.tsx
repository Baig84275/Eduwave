import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAccessibility } from "../../accessibility/AccessibilityProvider";
import { useAuth } from "../../auth/AuthContext";

// Screens
import { HomeScreen } from "../../screens/HomeScreen";
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
import { ManageCoursesScreen } from "../../screens/ManageCoursesScreen";
import { ManageCourseDetailScreen } from "../../screens/ManageCourseDetailScreen";
import { ProfileScreen } from "../../screens/ProfileScreen";
import { AccessibilitySettingsScreen as _AccessibilitySettingsScreen } from "../../screens/AccessibilitySettingsScreen";
const AccessibilitySettingsWrapper = (props: any) => <_AccessibilitySettingsScreen {...props} />;
import { AdminDashboardScreen } from "../../screens/AdminDashboardScreen";
import { CheckInScreen } from "../../screens/CheckInScreen";
import { FacilitatorJourneyScreen } from "../../screens/FacilitatorJourneyScreen";
import { SupervisionLogsScreen } from "../../screens/SupervisionLogsScreen";
import { CreateSupervisionLogScreen } from "../../screens/CreateSupervisionLogScreen";
import { SupervisionFollowUpScreen } from "../../screens/SupervisionFollowUpScreen";
import { InvitationsScreen } from "../../screens/InvitationsScreen";
import { MainInviteLinkScreen } from "../../screens/MainInviteLinkScreen";

export type HomeStackParamList = {
  Home: undefined;
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
  ManageCourses: undefined;
  ManageCourseDetail: { courseId: string };
  Profile: undefined;
  AccessibilitySettings: undefined;
  Admin: undefined;
  CheckIn: undefined;
  Journey: undefined;
  SupervisionLogs: undefined;
  CreateSupervisionLog: undefined;
  SupervisionFollowUp: { logId: string };
  Invitations: undefined;
  Invite: { token: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  const { config } = useAccessibility();
  const { session } = useAuth();
  const colors = config.color.colors;

  const userRole = session?.user?.role;
  const getInitialScreen = (): keyof HomeStackParamList => {
    switch (userRole) {
      case "TRAINER_SUPERVISOR": return "TrainerDashboard";
      case "ORG_ADMIN":          return "OrgOverview";
      default:                   return "Home";
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
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Dashboard" component={ChildListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TrainerDashboard" component={TrainerDashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrgOverview" component={OrgOverviewScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Child" component={ChildDetailScreen} options={{ title: "Child Profile" }} />
      <Stack.Screen name="CreateChild" component={CreateChildScreen} options={{ title: "Add Child" }} />
      <Stack.Screen name="AddUpdate" component={AddUpdateScreen} options={{ title: "Add Progress Update" }} />
      <Stack.Screen name="UploadMedia" component={UploadMediaScreen} options={{ title: "Upload Media" }} />
      <Stack.Screen name="Approvals" component={ApprovalsScreen} options={{ title: "Pending Approvals" }} />
      <Stack.Screen name="AssignFacilitator" component={AssignFacilitatorScreen} options={{ title: "Assign Facilitator" }} />
      <Stack.Screen name="AssignTraining" component={AssignTrainingScreen} options={{ title: "Assign Training" }} />
      <Stack.Screen name="ManageCourses" component={ManageCoursesScreen} options={{ title: "Manage Courses" }} />
      <Stack.Screen name="ManageCourseDetail" component={ManageCourseDetailScreen} options={{ title: "Course Detail" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AccessibilitySettings" component={AccessibilitySettingsWrapper} options={{ title: "Accessibility & Language" }} />
      <Stack.Screen name="Admin" component={AdminDashboardScreen} options={{ title: "Admin Dashboard" }} />
      <Stack.Screen name="CheckIn" component={CheckInScreen} options={{ title: "Daily Check-In" }} />
      <Stack.Screen name="Journey" component={FacilitatorJourneyScreen} options={{ title: "My Journey" }} />
      <Stack.Screen name="SupervisionLogs" component={SupervisionLogsScreen} options={{ title: "Supervision Logs" }} />
      <Stack.Screen name="CreateSupervisionLog" component={CreateSupervisionLogScreen} options={{ title: "New Supervision Log" }} />
      <Stack.Screen name="SupervisionFollowUp" component={SupervisionFollowUpScreen} options={{ title: "Follow-Up" }} />
      <Stack.Screen name="Invitations" component={InvitationsScreen} options={{ title: "Invitations" }} />
      <Stack.Screen name="Invite" component={MainInviteLinkScreen} options={{ title: "Accept Invitation" }} />
    </Stack.Navigator>
  );
}
