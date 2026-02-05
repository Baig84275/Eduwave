import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { api } from "../api/client";
import { AdminPermission, Role } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { TextField } from "../ui/TextField";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";
import { AppText } from "../ui/Text";

type AdminUser = {
  id: string;
  email: string;
  role: Role;
  organisationId?: string | null;
  deletedAt?: string | null;
  createdAt?: string;
};

export function AdminDashboardScreen() {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [organisations, setOrganisations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("FACILITATOR");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState("");
  const [orgProvince, setOrgProvince] = useState("");
  const [orgCity, setOrgCity] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "SUPER_ADMIN";
  const isSuperAdmin = session?.user.role === "SUPER_ADMIN";

  const [selectedUserPermissions, setSelectedUserPermissions] = useState<AdminPermission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [childDeleteId, setChildDeleteId] = useState("");

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

  const loadPermissions = useCallback(async () => {
    if (!session || !isSuperAdmin || !selectedUser) return;
    setLoadingPermissions(true);
    setError(null);
    try {
      const res = await api.get<{ permissions: Array<{ permission: AdminPermission }> }>(`/admin/users/${selectedUser.id}/permissions`, session);
      setSelectedUserPermissions(res.permissions.map((p) => p.permission));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load permissions");
    } finally {
      setLoadingPermissions(false);
    }
  }, [isSuperAdmin, selectedUser, session]);

  const loadOrgs = useCallback(async () => {
    if (!session) return;
    try {
      const res = await api.get<{ organisations: Array<{ id: string; name: string }> }>("/admin/organisations", session);
      setOrganisations(res.organisations);
    } catch (e: any) {
      setOrgError(e?.message ?? "Failed to load organisations");
    }
  }, [session]);

  useEffect(() => {
    loadUsers().catch(() => {});
    loadOrgs().catch(() => {});
  }, [loadUsers]);

  useEffect(() => {
    loadPermissions().catch(() => {});
  }, [loadPermissions]);

  const facilitators = useMemo(() => users.filter((u) => u.role === "FACILITATOR"), [users]);
  const trainers = useMemo(() => users.filter((u) => u.role === "TRAINER_SUPERVISOR"), [users]);
  const orgAdmins = useMemo(() => users.filter((u) => u.role === "ORG_ADMIN"), [users]);
  const admins = useMemo(() => users.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN"), [users]);

  const orgNameById = useMemo(() => new Map(organisations.map((o) => [o.id, o.name])), [organisations]);

  if (!isAdmin) {
    return (
      <ScrollScreen>
        <Card>
          <AppText variant="body" weight="black">
            Admin only
          </AppText>
          <AppText variant="body" tone="muted" style={{ marginTop: 8 }}>
            Sign in with an admin account to manage facilitators.
          </AppText>
        </Card>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <View style={{ gap: 16 }}>
        <ScreenHeader title="Admin" subtitle="Manage users and facilitators" />

        <Card>
          <AppText variant="h3">Create user</AppText>
          <View style={{ marginTop: 12, gap: 12 }}>
            <AppText variant="label" weight="black">
              Role
            </AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {(
                [
                  { value: "FACILITATOR", label: "Facilitator / Nanny" },
                  { value: "TRAINER_SUPERVISOR", label: "Trainer / Supervisor" },
                  { value: "ORG_ADMIN", label: "Organisation Admin" }
                ] as const
              ).map((r) => {
                const selected = newRole === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => setNewRole(r.value)}
                    style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                  >
                    <Card
                    style={{
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 2 : 1,
                      backgroundColor: selected ? colors.surface : colors.surfaceAlt
                    }}
                  >
                      <AppText variant="label" weight="black" style={{ color: selected ? colors.primary : colors.text }}>
                        {r.label}
                      </AppText>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
            <TextField label="Email" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" placeholder="facilitator@example.com" />
            <TextField label="Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Minimum 8 characters" />
            {createError ? <InlineAlert tone="danger" text={createError} /> : null}
            <AppButton
              title={creating ? "Creating..." : "Create user"}
              loading={creating}
              disabled={creating}
              onPress={async () => {
                if (!session) return;
                setCreating(true);
                setCreateError(null);
                try {
                  await api.post("/admin/users", { email: newEmail.trim(), password: newPassword, role: newRole }, session);
                  setNewEmail("");
                  setNewPassword("");
                  setNewRole("FACILITATOR");
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

        <Card>
          <AppText variant="h3">Organisations</AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
            Create organisations and assign users to them.
          </AppText>

          <View style={{ marginTop: 12, gap: 12 }}>
            <TextField label="Organisation name" value={orgName} onChangeText={setOrgName} placeholder="e.g., EduWave SA" />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <TextField label="Province (optional)" value={orgProvince} onChangeText={setOrgProvince} placeholder="e.g., Gauteng" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="City (optional)" value={orgCity} onChangeText={setOrgCity} placeholder="e.g., Johannesburg" />
              </View>
            </View>
            {orgError ? <InlineAlert tone="danger" text={orgError} /> : null}
            <AppButton
              title={creatingOrg ? "Creating..." : "Create organisation"}
              loading={creatingOrg}
              disabled={creatingOrg}
              onPress={async () => {
                if (!session) return;
                if (!orgName.trim()) {
                  setOrgError("Organisation name is required");
                  return;
                }
                setCreatingOrg(true);
                setOrgError(null);
                try {
                  await api.post(
                    "/admin/organisations",
                    { name: orgName.trim(), province: orgProvince.trim() || null, city: orgCity.trim() || null },
                    session
                  );
                  setOrgName("");
                  setOrgProvince("");
                  setOrgCity("");
                  await loadOrgs();
                } catch (e: any) {
                  setOrgError(e?.message ?? "Failed to create organisation");
                } finally {
                  setCreatingOrg(false);
                }
              }}
            />
          </View>

          <View style={{ marginTop: 16, gap: 12 }}>
            {selectedUser ? (
              <Card style={{ backgroundColor: colors.surfaceAlt }}>
                <AppText variant="label" weight="black">Assign organisation</AppText>
                <AppText variant="body" weight="bold" style={{ marginTop: 6 }}>{selectedUser.email}</AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>{selectedUser.id}</AppText>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                  <AppButton
                    title="Clear org"
                    variant="secondary"
                    onPress={async () => {
                      if (!session) return;
                      await api.patch(`/admin/users/${selectedUser.id}/organisation`, { organisationId: null }, session);
                      setSelectedUser(null);
                      await loadUsers();
                    }}
                  />
                  <AppButton title="Done" variant="ghost" onPress={() => setSelectedUser(null)} />
                </View>
                <View style={{ gap: 8, marginTop: 12 }}>
                  {organisations.map((o) => (
                    <AppButton
                      key={o.id}
                      title={o.name}
                      variant="secondary"
                      onPress={async () => {
                        if (!session) return;
                        await api.patch(`/admin/users/${selectedUser.id}/organisation`, { organisationId: o.id }, session);
                        setSelectedUser(null);
                        await loadUsers();
                      }}
                    />
                  ))}
                </View>
              </Card>
            ) : (
              <Card style={{ backgroundColor: colors.surfaceAlt }}>
                <AppText variant="body" tone="muted">Select a user below to assign an organisation.</AppText>
              </Card>
            )}
          </View>
        </Card>

        <Card>
          <AppText variant="h3">Delete</AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>Super admin can grant delete rights to specific admins.</AppText>

          <View style={{ marginTop: 12, gap: 12 }}>
            {selectedUser ? (
              <>
                <AppText variant="label" weight="black">Selected user</AppText>
                <AppText variant="body" weight="bold">{selectedUser.email}</AppText>
                <AppText variant="caption" tone="muted">{selectedUser.id}</AppText>

                {isSuperAdmin ? (
                  <View style={{ gap: 8, marginTop: 8 }}>
                    <AppText variant="label" weight="black">
                      Delete permissions {loadingPermissions ? "(loading...)" : ""}
                    </AppText>
                    {(
                      [
                        { permission: "DELETE_USERS" as const, label: "Can delete users" },
                        { permission: "DELETE_CHILDREN" as const, label: "Can delete children" }
                      ] as const
                    ).map((p) => {
                      const enabled = selectedUserPermissions.includes(p.permission);
                      return (
                        <Pressable
                          key={p.permission}
                          onPress={async () => {
                            if (!session) return;
                            setError(null);
                            try {
                              if (enabled) {
                                await api.post("/admin/permissions/revoke", { userId: selectedUser.id, permission: p.permission }, session);
                              } else {
                                await api.post("/admin/permissions/grant", { userId: selectedUser.id, permission: p.permission }, session);
                              }
                              await loadPermissions();
                            } catch (e: any) {
                              setError(e?.message ?? "Failed to update permission");
                            }
                          }}
                          style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                        >
                          <Card
                            style={{
                              borderColor: enabled ? colors.primary : colors.border,
                              borderWidth: enabled ? 2 : 1,
                              backgroundColor: enabled ? colors.surface : colors.surfaceAlt
                            }}
                          >
                            <AppText variant="label" weight="black" style={{ color: enabled ? colors.primary : colors.text }}>
                              {p.label}: {enabled ? "Yes" : "No"}
                            </AppText>
                          </Card>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                <AppButton
                  title="Delete selected user"
                  variant="secondary"
                  onPress={async () => {
                    if (!session || !selectedUser) return;
                    setError(null);
                    try {
                      await api.del(`/users/${selectedUser.id}`, session);
                      setSelectedUser(null);
                      await loadUsers();
                    } catch (e: any) {
                      setError(e?.message ?? "Failed to delete user");
                    }
                  }}
                />
              </>
            ) : (
              <AppText variant="body" tone="muted">Select a user to manage delete permissions and deletion.</AppText>
            )}

            <TextField label="Delete child by ID" value={childDeleteId} onChangeText={setChildDeleteId} placeholder="Paste childId" />
            <AppButton
              title="Delete child"
              variant="secondary"
              onPress={async () => {
                if (!session) return;
                if (!childDeleteId.trim()) {
                  setError("Child ID is required");
                  return;
                }
                setError(null);
                try {
                  await api.del(`/children/${childDeleteId.trim()}`, session);
                  setChildDeleteId("");
                } catch (e: any) {
                  setError(e?.message ?? "Failed to delete child");
                }
              }}
            />
          </View>
        </Card>

        {error ? <InlineAlert tone="danger" text={error} /> : null}

        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <AppText variant="h3">Users</AppText>
            <View style={{ width: 120 }}>
              <AppButton title={loading ? "Refreshing..." : "Refresh"} variant="secondary" onPress={loadUsers} />
            </View>
          </View>

          <View style={{ marginTop: 16, gap: 12 }}>
            <AppText variant="label" weight="black">Admins</AppText>
            <FlatList
              data={admins}
              scrollEnabled={false}
              keyExtractor={(u) => u.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <Pressable onPress={() => setSelectedUser(item)} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
                  <Card style={{ backgroundColor: colors.surfaceAlt }}>
                    <AppText variant="body" weight="black">{item.email}</AppText>
                    <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
                      {item.role}
                      {item.organisationId ? ` · ${orgNameById.get(item.organisationId) ?? item.organisationId}` : ""}
                    </AppText>
                  </Card>
                </Pressable>
              )}
            />

            <AppText variant="label" weight="black">Facilitators</AppText>
            <FlatList
              data={facilitators}
              scrollEnabled={false}
              keyExtractor={(u) => u.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <Pressable onPress={() => setSelectedUser(item)} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
                  <Card style={{ backgroundColor: colors.surfaceAlt }}>
                    <AppText variant="body" weight="black">{item.email}</AppText>
                    <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
                      {item.id}
                      {item.organisationId ? ` · ${orgNameById.get(item.organisationId) ?? item.organisationId}` : ""}
                    </AppText>
                  </Card>
                </Pressable>
              )}
            />

            <AppText variant="label" weight="black">Trainers / Supervisors</AppText>
            <FlatList
              data={trainers}
              scrollEnabled={false}
              keyExtractor={(u) => u.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <Pressable onPress={() => setSelectedUser(item)} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
                  <Card style={{ backgroundColor: colors.surfaceAlt }}>
                    <AppText variant="body" weight="black">{item.email}</AppText>
                    <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
                      {item.id}
                      {item.organisationId ? ` · ${orgNameById.get(item.organisationId) ?? item.organisationId}` : ""}
                    </AppText>
                  </Card>
                </Pressable>
              )}
            />

            <AppText variant="label" weight="black">Organisation Admins</AppText>
            <FlatList
              data={orgAdmins}
              scrollEnabled={false}
              keyExtractor={(u) => u.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <Pressable onPress={() => setSelectedUser(item)} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
                  <Card style={{ backgroundColor: colors.surfaceAlt }}>
                    <AppText variant="body" weight="black">{item.email}</AppText>
                    <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
                      {item.id}
                      {item.organisationId ? ` · ${orgNameById.get(item.organisationId) ?? item.organisationId}` : ""}
                    </AppText>
                  </Card>
                </Pressable>
              )}
            />
          </View>
        </Card>
      </View>
    </ScrollScreen>
  );
}
