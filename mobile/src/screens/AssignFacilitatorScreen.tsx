import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { api } from "../api/client";
import { Role } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ChildrenStackParamList } from "../navigation/stacks/ChildrenStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { TextField } from "../ui/TextField";
import { AppText } from "../ui/Text";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";

type Props = NativeStackScreenProps<ChildrenStackParamList, "AssignFacilitator">;

type AdminUser = {
  id: string;
  email: string;
  role: Role;
};

export function AssignFacilitatorScreen({ route, navigation }: Props) {
  const { childId } = route.params;
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "SUPER_ADMIN";

  const loadUsers = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ users: AdminUser[] }>("/admin/users", session);
      setUsers(res.users);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadUsers().catch(() => {});
  }, [loadUsers]);

  const facilitators = useMemo(() => {
    const list = users.filter((u) => u.role === "FACILITATOR");
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q));
  }, [users, query]);

  if (!isAdmin) {
    return (
      <Screen>
        <ScreenHeader title="Access Denied" />
        <Card>
          <AppText variant="label" weight="black">Admin only</AppText>
          <AppText variant="body" tone="muted" style={{ marginTop: 8 }}>Only admins can assign facilitators.</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader 
        title="Assign facilitator" 
        subtitle={`Child ID: ${childId}`}
      />

      <TextField label="Search" value={query} onChangeText={setQuery} autoCapitalize="none" placeholder="Search by email" />

      {error ? <InlineAlert tone="danger" text={error} /> : null}

      <FlatList
        data={facilitators}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 24, paddingTop: 12 }}
        ListEmptyComponent={
          <Card style={{ backgroundColor: colors.surfaceAlt }}>
            <AppText variant="label" weight="black">No facilitators found</AppText>
            <AppText variant="body" tone="muted" style={{ marginTop: 8 }}>
              Create a facilitator from the Admin screen, then assign it here.
            </AppText>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}>
            <Card>
              <AppText variant="body" weight="black">{item.email}</AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>{item.id}</AppText>
              <View style={{ marginTop: 12 }}>
                <AppButton
                  title={assigningId === item.id ? "Assigning..." : "Assign to child"}
                  loading={assigningId === item.id}
                  disabled={Boolean(assigningId) || loading}
                  onPress={async () => {
                    if (!session) return;
                    setAssigningId(item.id);
                    setError(null);
                    try {
                      await api.post(`/children/${childId}/assign-facilitator`, { facilitatorId: item.id }, session);
                      navigation.goBack();
                    } catch (e: any) {
                      setError(e?.message ?? "Failed to assign");
                    } finally {
                      setAssigningId(null);
                    }
                  }}
                />
              </View>
            </Card>
          </Pressable>
        )}
      />

      <View style={{ flexDirection: "row", gap: 12, paddingVertical: 12 }}>
        <View style={{ flex: 1 }}>
          <AppButton title={loading ? "Refreshing..." : "Refresh list"} variant="secondary" onPress={loadUsers} />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton title="Open Admin" variant="ghost" onPress={() => (navigation as any).navigate("ProfileTab", { screen: "Admin" })} />
        </View>
      </View>
    </Screen>
  );
}

