import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SosScreen } from "../../screens/SosScreen";

export type SosStackParamList = {
  Sos: undefined;
};

const Stack = createNativeStackNavigator<SosStackParamList>();

export function SosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Sos" component={SosScreen} />
    </Stack.Navigator>
  );
}
