import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../auth/AuthContext";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { BottomTabBar } from "../ui/BottomTabBar";

// Import stacks
import { HomeStack } from "./stacks/HomeStack";
import { ChildrenStack } from "./stacks/ChildrenStack";
import { TrainingStack } from "./stacks/TrainingStack";
import { ResourcesStack } from "./stacks/ResourcesStack";
import { ProfileStack } from "./stacks/ProfileStack";
import { CoursesStack } from "./stacks/CoursesStack";

export type MainTabsParamList = {
  HomeTab: undefined;
  ChildrenTab: undefined;
  TrainingTab: undefined;
  ResourcesTab: undefined;
  CoursesTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

// Define which roles can see which tabs
const TAB_VISIBILITY: Record<string, string[]> = {
  HomeTab: ["PARENT", "FACILITATOR", "TEACHER", "THERAPIST", "TRAINER_SUPERVISOR", "ORG_ADMIN", "ADMIN", "SUPER_ADMIN"],
  ChildrenTab: ["PARENT", "FACILITATOR", "TEACHER", "THERAPIST", "TRAINER_SUPERVISOR", "ORG_ADMIN", "ADMIN", "SUPER_ADMIN"],
  TrainingTab: ["FACILITATOR", "TEACHER", "THERAPIST", "TRAINER_SUPERVISOR", "ORG_ADMIN", "ADMIN", "SUPER_ADMIN"],
  ResourcesTab: ["FACILITATOR", "TEACHER", "THERAPIST", "TRAINER_SUPERVISOR", "ORG_ADMIN", "ADMIN", "SUPER_ADMIN"],
  CoursesTab: ["TRAINER_SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  ProfileTab: ["PARENT", "FACILITATOR", "TEACHER", "THERAPIST", "TRAINER_SUPERVISOR", "ORG_ADMIN", "ADMIN", "SUPER_ADMIN"],
};

export function MainTabs() {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const userRole = session?.user?.role || "PARENT";

  // Filter tabs based on user role
  const canSeeTab = (tabName: string) => {
    return TAB_VISIBILITY[tabName]?.includes(userRole) ?? false;
  };

  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {canSeeTab("HomeTab") && (
        <Tab.Screen
          name="HomeTab"
          component={HomeStack}
          options={{
            title: "Home",
          }}
        />
      )}

      {canSeeTab("ChildrenTab") && (
        <Tab.Screen
          name="ChildrenTab"
          component={ChildrenStack}
          options={{
            title: "Children",
          }}
        />
      )}

      {canSeeTab("TrainingTab") && (
        <Tab.Screen
          name="TrainingTab"
          component={TrainingStack}
          options={{
            title: "Training",
          }}
        />
      )}

      {canSeeTab("ResourcesTab") && (
        <Tab.Screen
          name="ResourcesTab"
          component={ResourcesStack}
          options={{
            title: "Resources",
          }}
        />
      )}

      {canSeeTab("CoursesTab") && (
        <Tab.Screen
          name="CoursesTab"
          component={CoursesStack}
          options={{
            title: "Courses",
          }}
        />
      )}

      {canSeeTab("ProfileTab") && (
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStack}
          options={{
            title: "Profile",
          }}
        />
      )}
    </Tab.Navigator>
  );
}
