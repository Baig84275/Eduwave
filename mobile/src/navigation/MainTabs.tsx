import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../auth/AuthContext";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { BottomTabBar } from "../ui/BottomTabBar";

// Import stacks
import { HomeStack } from "./stacks/HomeStack";
import { ResourcesStack } from "./stacks/ResourcesStack";
import { SosStack } from "./stacks/SosStack";
import { ChildrenStack } from "./stacks/ChildrenStack";
import { TrainingStack } from "./stacks/TrainingStack";

export type MainTabsParamList = {
  HomeTab: undefined;
  ResourcesTab: undefined;
  SosTab: undefined;
  TrackerTab: undefined;
  LearnTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

// Which roles see which tabs
const TAB_VISIBILITY: Record<string, string[]> = {
  HomeTab:      ["PARENT", "FACILITATOR", "TEACHER", "THERAPIST", "TRAINER_SUPERVISOR", "ORG_ADMIN", "ADMIN", "SUPER_ADMIN"],
  ResourcesTab: ["PARENT", "FACILITATOR", "TEACHER", "THERAPIST", "TRAINER_SUPERVISOR", "ORG_ADMIN", "ADMIN", "SUPER_ADMIN"],
  SosTab:       ["PARENT", "FACILITATOR", "TEACHER", "THERAPIST", "TRAINER_SUPERVISOR", "ORG_ADMIN", "ADMIN", "SUPER_ADMIN"],
  TrackerTab:   ["PARENT", "FACILITATOR", "TEACHER", "THERAPIST", "TRAINER_SUPERVISOR", "ORG_ADMIN", "ADMIN", "SUPER_ADMIN"],
  LearnTab:     ["FACILITATOR", "TEACHER", "THERAPIST", "TRAINER_SUPERVISOR", "ORG_ADMIN", "ADMIN", "SUPER_ADMIN"],
};

export function MainTabs() {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const userRole = session?.user?.role || "PARENT";
  const canSee = (tab: string) => TAB_VISIBILITY[tab]?.includes(userRole) ?? false;

  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {canSee("HomeTab") && (
        <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: "Home" }} />
      )}
      {canSee("ResourcesTab") && (
        <Tab.Screen name="ResourcesTab" component={ResourcesStack} options={{ title: "Resources" }} />
      )}
      {canSee("SosTab") && (
        <Tab.Screen name="SosTab" component={SosStack} options={{ title: "SOS" }} />
      )}
      {canSee("TrackerTab") && (
        <Tab.Screen name="TrackerTab" component={ChildrenStack} options={{ title: "Tracker" }} />
      )}
      {canSee("LearnTab") && (
        <Tab.Screen name="LearnTab" component={TrainingStack} options={{ title: "Learn" }} />
      )}
    </Tab.Navigator>
  );
}
