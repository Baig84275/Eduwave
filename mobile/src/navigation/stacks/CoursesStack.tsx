import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAccessibility } from "../../accessibility/AccessibilityProvider";
import { ManageCoursesScreen } from "../../screens/ManageCoursesScreen";
import { ManageCourseDetailScreen } from "../../screens/ManageCourseDetailScreen";
import { AssignTrainingScreen } from "../../screens/AssignTrainingScreen";

export type CoursesStackParamList = {
  CoursesList: undefined;
  ManageCourseDetail: { courseId: string };
  AssignTraining: undefined;
};

const Stack = createNativeStackNavigator<CoursesStackParamList>();

export function CoursesStack() {
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
        name="CoursesList"
        component={ManageCoursesScreen}
        options={{ title: "Courses", headerShown: false }}
      />
      <Stack.Screen
        name="ManageCourseDetail"
        component={ManageCourseDetailScreen}
        options={{ title: "Course Detail" }}
      />
      <Stack.Screen
        name="AssignTraining"
        component={AssignTrainingScreen}
        options={{ title: "Assign Training" }}
      />
    </Stack.Navigator>
  );
}
