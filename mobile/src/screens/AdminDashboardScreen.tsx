import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { api } from "../api/client";
import { Role } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { TextField } from "../ui/TextField";

type AdminUser = {
  id: string;
  email: string;
  role: Role;
  createdAt?: string;
};

export function AdminDashboardScreen() {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  const facilitators = useMemo(() => users.filter((u) => u.role === "FACILITATOR"), [users]);
  const admins = useMemo(() => users.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN"), [users]);

  if (!isAdmin) {
    return (
      <ScrollScreen>
        <Card>
          <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Admin only</Text>
          <Text style={{ marginTop: 8, color: colors.textMuted }}>
            Sign in with an admin account to manage facilitators.
          </Text>
        </Card>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text, letterSpacing: config.typography.letterSpacing }}>
        Admin
      </Text>
      <Text style={{ color: colors.textMuted }}>Manage users and facilitators</Text>

      <Card>
        <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Create facilitator</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          <TextField label="Email" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" placeholder="facilitator@example.com" />
          <TextField label="Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Minimum 8 characters" />
          {createError ? <Text style={{ color: colors.danger, fontSize: 13 }}>{createError}</Text> : null}
          <AppButton
            title={creating ? "Creating..." : "Create facilitator"}
            loading={creating}
            disabled={creating}
            onPress={async () => {
              if (!session) return;
              setCreating(true);
              setCreateError(null);
              try {
                await api.post("/admin/users", { email: newEmail.trim(), password: newPassword, role: "FACILITATOR" }, session);
                setNewEmail("");
                setNewPassword("");
                await loadUsers();
              } catch (e: any) {
                setCreateError(e?.message ?? "Failed to create user");
              } finally {
                setCreating(false);
              }
            }}
          />
        </View>
      </Card>

      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Users</Text>
          <View style={{ width: 120 }}>
            <AppButton title={loading ? "Refreshing..." : "Refresh"} variant="secondary" onPress={loadUsers} />
          </View>
        </View>

        <View style={{ marginTop: 12, gap: 10 }}>
          <Text style={{ fontWeight: "900", color: colors.text }}>Admins</Text>
          <FlatList
            data={admins}
            scrollEnabled={false}
            keyExtractor={(u) => u.id}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <Card style={{ backgroundColor: colors.surfaceAlt }}>
                <Text style={{ color: colors.text, fontWeight: "900" }}>{item.email}</Text>
                <Text style={{ marginTop: 6, color: colors.textMuted }}>{item.role}</Text>
              </Card>
            )}
          />

          <Text style={{ fontWeight: "900", color: colors.text }}>Facilitators</Text>
          <FlatList
            data={facilitators}
            scrollEnabled={false}
            keyExtractor={(u) => u.id}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <Card style={{ backgroundColor: colors.surfaceAlt }}>
                <Text style={{ color: colors.text, fontWeight: "900" }}>{item.email}</Text>
                <Text style={{ marginTop: 6, color: colors.textMuted }}>{item.id}</Text>
              </Card>
            )}
          />
        </View>
      </Card>
    </ScrollScreen>
  );
}
