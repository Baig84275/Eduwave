import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { AuthStack } from "./src/navigation/AuthStack";
import { MainStack } from "./src/navigation/MainStack";
import { AccessibilityProvider, useAccessibility } from "./src/accessibility/AccessibilityProvider";
import { SetupStack } from "./src/navigation/SetupStack";
import { getNavigationTheme } from "./src/theme/navigationTheme";
import { I18nProvider } from "./src/i18n/I18nProvider";

function RootNavigator() {
  const { session } = useAuth();
  if (!session) return <AuthStack />;
  if (!session.user.accessibilityMode) return <SetupStack />;
  return <MainStack />;
}

export default function App() {
  return (
    <AuthProvider>
      <AccessibilityProvider>
        <I18nProvider>
          <AppNavigation />
        </I18nProvider>
      </AccessibilityProvider>
    </AuthProvider>
  );
}

function AppNavigation() {
  const { config } = useAccessibility();
  const theme = getNavigationTheme(config.color.colors, { fontFamily: config.typography.fontFamily });
  const linking = {
    prefixes: ["eduwave://"],
    config: { screens: { Invite: "invite" } }
  };
  return (
    <NavigationContainer theme={theme} linking={linking}>
      <RootNavigator />
    </NavigationContainer>
  );
}
