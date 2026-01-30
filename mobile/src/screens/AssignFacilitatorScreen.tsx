import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { api } from "../api/client";
import { Role } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { TextField } from "../ui/TextField";

type Props = NativeStackScreenProps<MainStackParamList, "AssignFacilitator">;

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
        <Card>
          <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Admin only</Text>
          <Text style={{ marginTop: 8, color: colors.textMuted }}>Only admins can assign facilitators.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text, letterSpacing: config.typography.letterSpacing }}>
        Assign facilitator
      </Text>
      <Text style={{ color: colors.textMuted }}>Child: {childId}</Text>

      <TextField label="Search" value={query} onChangeText={setQuery} autoCapitalize="none" placeholder="Search by email" />

      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}

      <FlatList
        data={facilitators}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 6 }}
        ListEmptyComponent={
          <Card>
            <Text style={{ color: colors.text, fontWeight: "900" }}>No facilitators found</Text>
            <Text style={{ marginTop: 8, color: colors.textMuted }}>
              Create a facilitator from the Admin screen, then assign it here.
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}>
            <Card>
              <Text style={{ color: colors.text, fontWeight: "900" }}>{item.email}</Text>
              <Text style={{ marginTop: 6, color: colors.textMuted }}>{item.id}</Text>
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

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <AppButton title={loading ? "Refreshing..." : "Refresh list"} variant="secondary" onPress={loadUsers} />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton title="Open Admin" variant="ghost" onPress={() => navigation.navigate("Admin")} />
        </View>
      </View>
    </Screen>
  );
}

