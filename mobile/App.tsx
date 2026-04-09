import { NavigationContainer } from "@react-navigation/native";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { AuthStack } from "./src/navigation/AuthStack";
import { MainTabs } from "./src/navigation/MainTabs";
import { AccessibilityProvider, useAccessibility } from "./src/accessibility/AccessibilityProvider";
import { SetupStack } from "./src/navigation/SetupStack";
import { getNavigationTheme } from "./src/theme/navigationTheme";
import { I18nProvider } from "./src/i18n/I18nProvider";
import { ToastProvider } from "./src/ui/ToastProvider";
import { ErrorBoundary } from "./src/ui/ErrorBoundary";

// Silence only very noisy third-party warnings with no actionable info.
// Keep everything else visible so errors surface clearly in Metro terminal.
LogBox.ignoreLogs([
  "Non-serializable values were found in the navigation state",
  "[Reanimated] Reduced motion",
]);

function RootNavigator() {
  const { session } = useAuth();
  const { hasCompletedSetup } = useAccessibility();
  // Not logged in → show login/register
  if (!session) return <AuthStack />;
  // Logged in but no accessibility mode chosen yet → show 3-step onboarding
  if (!hasCompletedSetup) return <SetupStack />;
  return <MainTabs />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <AccessibilityProvider>
              <I18nProvider>
                <ToastProvider>
                  <AppNavigation />
                </ToastProvider>
              </I18nProvider>
            </AccessibilityProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

function AppNavigation() {
  const { config } = useAccessibility();
  const theme = getNavigationTheme(config.color.colors, { fontFamily: config.typography.fontFamily });
  const linking = {
    prefixes: ["eduwave://"],
    config: {
      screens: {
        HomeTab: "invite/:token",
      },
    },
  } as const as any;
  return (
    <NavigationContainer theme={theme} linking={linking}>
      <RootNavigator />
    </NavigationContainer>
  );
}
