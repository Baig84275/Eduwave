import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingLanguageScreen } from "../screens/OnboardingLanguageScreen";
import { OnboardingAccessibilityScreen } from "../screens/OnboardingAccessibilityScreen";
import { OnboardingConfirmScreen } from "../screens/OnboardingConfirmScreen";

export type SetupStackParamList = {
  OnboardingLanguage: undefined;
  OnboardingAccessibility: { selectedLanguage: string };
  OnboardingConfirm: { selectedLanguage: string; selectedMode: string };
};

const Stack = createNativeStackNavigator<SetupStackParamList>();

export function SetupStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="OnboardingLanguage" component={OnboardingLanguageScreen} />
      <Stack.Screen name="OnboardingAccessibility" component={OnboardingAccessibilityScreen} />
      <Stack.Screen name="OnboardingConfirm" component={OnboardingConfirmScreen} />
    </Stack.Navigator>
  );
}
