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
  const isFacilitator = session?.user.role === "FACILITATOR";
  const isTrainer = session?.user.role === "TRAINER_SUPERVISOR";
  const isOrgAdmin = session?.user.role === "ORG_ADMIN";
  const hasSupportModules = !!session && session.user.role !== "PARENT";

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
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
        data={children}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <Card style={{ backgroundColor: colors.surfaceAlt }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ gap: 4, flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: "900",
                      color: colors.text,
                      letterSpacing: config.typography.letterSpacing
                    }}
                  >
                    Children
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.textMuted }}>
                    {session?.user.email ?? "Your profiles and assignments"}
                  </Text>
                </View>
                <View style={{ width: 120 }}>
                  <AppButton title="Logout" variant="secondary" onPress={logout} />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                {session?.user.role === "PARENT" ? (
                  <View style={{ minWidth: 180, flexGrow: 1 }}>
                    <AppButton title="Create child profile" onPress={() => navigation.navigate("CreateChild")} />
                  </View>
                ) : null}
                <View style={{ minWidth: 180, flexGrow: 1 }}>
                  <AppButton title="Accessibility" variant="secondary" onPress={() => navigation.navigate("Accessibility")} />
                </View>
                <View style={{ minWidth: 180, flexGrow: 1 }}>
                  <AppButton title="Invitations" variant="secondary" onPress={() => navigation.navigate("Invitations")} />
                </View>
                {hasSupportModules ? (
                  <View style={{ minWidth: 180, flexGrow: 1 }}>
                    <AppButton title="Resources" variant="secondary" onPress={() => navigation.navigate("Resources")} />
                  </View>
                ) : null}
                {isFacilitator ? (
                  <>
                    <View style={{ minWidth: 180, flexGrow: 1 }}>
                      <AppButton title="Check-in" onPress={() => navigation.navigate("CheckIn")} />
                    </View>
                    <View style={{ minWidth: 180, flexGrow: 1 }}>
                      <AppButton title="My journey" variant="secondary" onPress={() => navigation.navigate("Journey")} />
                    </View>
                    <View style={{ minWidth: 180, flexGrow: 1 }}>
                      <AppButton title="Training" variant="secondary" onPress={() => navigation.navigate("TrainingHub")} />
                    </View>
                    <View style={{ minWidth: 180, flexGrow: 1 }}>
                      <AppButton
                        title="Supervision logs"
                        variant="secondary"
                        onPress={() => navigation.navigate("SupervisionLogs")}
                      />
                    </View>
                  </>
                ) : null}
                {isTrainer ? (
                  <>
                    <View style={{ minWidth: 180, flexGrow: 1 }}>
                      <AppButton
                        title="Supervision logs"
                        variant="secondary"
                        onPress={() => navigation.navigate("SupervisionLogs")}
                      />
                    </View>
                    <View style={{ minWidth: 180, flexGrow: 1 }}>
                      <AppButton title="Training" variant="secondary" onPress={() => navigation.navigate("TrainingHub")} />
                    </View>
                    <View style={{ minWidth: 180, flexGrow: 1 }}>
                      <AppButton
                        title="Trainer dashboard"
                        variant="secondary"
                        onPress={() => navigation.navigate("TrainerDashboard")}
                      />
                    </View>
                  </>
                ) : null}
                {isOrgAdmin ? (
                  <View style={{ minWidth: 180, flexGrow: 1 }}>
                    <AppButton title="Org overview" variant="secondary" onPress={() => navigation.navigate("OrgOverview")} />
                  </View>
                ) : null}
                {isAdmin ? (
                  <View style={{ minWidth: 180, flexGrow: 1 }}>
                    <AppButton title="Admin" variant="secondary" onPress={() => navigation.navigate("Admin")} />
                  </View>
                ) : null}
                {isAdmin ? (
                  <>
                    <View style={{ minWidth: 180, flexGrow: 1 }}>
                      <AppButton
                        title="Supervision logs"
                        variant="secondary"
                        onPress={() => navigation.navigate("SupervisionLogs")}
                      />
                    </View>
                    <View style={{ minWidth: 180, flexGrow: 1 }}>
                      <AppButton title="Training" variant="secondary" onPress={() => navigation.navigate("TrainingHub")} />
                    </View>
                    <View style={{ minWidth: 180, flexGrow: 1 }}>
                      <AppButton title="Org overview" variant="secondary" onPress={() => navigation.navigate("OrgOverview")} />
                    </View>
                  </>
                ) : null}
              </View>
            </Card>

            {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <Card style={{ backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.text, fontWeight: "900" }}>No profiles yet</Text>
            <Text style={{ color: colors.textMuted, marginTop: 6 }}>
              {session?.user.role === "PARENT"
                ? "Create a child profile to get started."
                : "No child profiles are assigned to this account yet."}
            </Text>
          </Card>
        }
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
