import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { api } from "../api/client";
import { Child } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";

type Props = NativeStackScreenProps<MainStackParamList, "Children">;

export function ChildListScreen({ navigation }: Props) {
  const { session, logout } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const [children, setChildren] = useState<Child[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "SUPER_ADMIN";

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setError(null);
          const res = await api.get<{ children: Child[] }>("/children", session);
          if (!cancelled) setChildren(res.children);
        } catch (e: any) {
          if (!cancelled) setError(e?.message ?? "Failed to load");
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [session])
  );

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 28, fontWeight: "900", color: colors.text, letterSpacing: config.typography.letterSpacing }}>
            Children
          </Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>Your profiles and assignments</Text>
        </View>
        <View style={{ width: 110 }}>
          <AppButton title="Logout" variant="secondary" onPress={logout} />
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        {session?.user.role === "PARENT" ? (
          <View style={{ minWidth: 180, flexGrow: 1 }}>
            <AppButton title="Create child profile" onPress={() => navigation.navigate("CreateChild")} />
          </View>
        ) : null}
        <View style={{ minWidth: 180, flexGrow: 1 }}>
          <AppButton title="Accessibility" variant="secondary" onPress={() => navigation.navigate("Accessibility")} />
        </View>
        {isAdmin ? (
          <View style={{ minWidth: 180, flexGrow: 1 }}>
            <AppButton title="Admin" variant="secondary" onPress={() => navigation.navigate("Admin")} />
          </View>
        ) : null}
      </View>

      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
        data={children}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          return (
            <Pressable
              onPress={() => navigation.navigate("Child", { childId: item.id })}
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
            >
              <Card>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{item.name}</Text>
                <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                  {new Date(item.dateOfBirth).toDateString()}
                </Text>
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
