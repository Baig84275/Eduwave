import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAccessibility } from "../../accessibility/AccessibilityProvider";

// Screens
import { TrainingHubScreen } from "../../screens/TrainingHubScreen";
import { TrainingCoursesScreen } from "../../screens/TrainingCoursesScreen";
import { TrainingReflectionsScreen } from "../../screens/TrainingReflectionsScreen";
import { TrainingReflectionFormScreen } from "../../screens/TrainingReflectionFormScreen";
import { AssignTrainingScreen } from "../../screens/AssignTrainingScreen";
import { ManageCoursesScreen } from "../../screens/ManageCoursesScreen";
import { ManageCourseDetailScreen } from "../../screens/ManageCourseDetailScreen";

export type TrainingStackParamList = {
  TrainingHub: undefined;
  TrainingCourses: undefined;
  TrainingReflections: undefined;
  TrainingReflection: { moduleId: string; courseId: string; moduleName: string };
  AssignTraining: undefined;
  ManageCourses: undefined;
  ManageCourseDetail: { courseId: string };
};

const Stack = createNativeStackNavigator<TrainingStackParamList>();

export function TrainingStack() {
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
        name="TrainingHub"
        component={TrainingHubScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TrainingCourses"
        component={TrainingCoursesScreen}
        options={{ title: "Courses" }}
      />
      <Stack.Screen
        name="TrainingReflections"
        component={TrainingReflectionsScreen}
        options={{ title: "My Reflections" }}
      />
      <Stack.Screen
        name="TrainingReflection"
        component={TrainingReflectionFormScreen}
        options={{ title: "Add Reflection" }}
      />
      <Stack.Screen
        name="AssignTraining"
        component={AssignTrainingScreen}
        options={{ title: "Assign Training" }}
      />
      <Stack.Screen
        name="ManageCourses"
        component={ManageCoursesScreen}
        options={{ title: "Manage Courses" }}
      />
      <Stack.Screen
        name="ManageCourseDetail"
        component={ManageCourseDetailScreen}
        options={{ title: "Course Detail" }}
      />
    </Stack.Navigator>
  );
}
