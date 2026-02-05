import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { api } from "../api/client";
import { Child } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { AppText } from "../ui/Text";
import { InlineAlert } from "../ui/InlineAlert";
import { ScreenHeader } from "../ui/ScreenHeader";
import { EmptyState } from "../ui/EmptyState";

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

  const getTitle = () => {
    if (session?.user.role === "SUPER_ADMIN") return "Superadmin";
    if (isAdmin) return "Admin Dashboard";
    if (isOrgAdmin) return "Organization Dashboard";
    if (isTrainer) return "Trainer Dashboard";
    if (isFacilitator) return "My Assignments";
    return "Children";
  };

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
        contentContainerStyle={{ paddingVertical: 4, gap: 12 }}
        data={children}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <Card style={{ backgroundColor: colors.surfaceAlt }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ gap: 4, flex: 1 }}>
                  <ScreenHeader title={getTitle()} subtitle={session?.user.email ?? "Your profiles and assignments"} />
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
                      <AppButton title="Training" variant="secondary" onPress={() => navigation.navigate("TrainingCourses")} />
                    </View>
                    <View style={{ minWidth: 180, flexGrow: 1 }}>
                      <AppButton title="Training hub" variant="secondary" onPress={() => navigation.navigate("TrainingHub")} />
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

            {error ? <InlineAlert tone="danger" text={error} /> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No profiles yet"
            message={
              session?.user.role === "PARENT"
                ? "Create a child profile to get started."
                : "No child profiles are assigned to this account yet."
            }
          />
        }
        renderItem={({ item }) => {
          return (
            <Pressable
              onPress={() => navigation.navigate("Child", { childId: item.id })}
              style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
            >
              <Card>
                <AppText variant="body" weight="semibold">
                  {item.name}
                </AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                  {new Date(item.dateOfBirth).toDateString()}
                </AppText>
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
