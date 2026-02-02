import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { api } from "../api/client";
import { AdminPermission, Role } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { TextField } from "../ui/TextField";

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
        <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Create user</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          <Text style={{ fontWeight: "900", color: colors.text }}>Role</Text>
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
                <Card
                  key={r.value}
                  style={{
                    borderColor: selected ? colors.focusRing : colors.border,
                    borderWidth: selected ? 2 : 1
                  }}
                >
                  <Text
                    onPress={() => setNewRole(r.value)}
                    style={{ color: colors.text, fontWeight: "900" }}
                  >
                    {r.label}
                  </Text>
                </Card>
              );
            })}
          </View>
          <TextField label="Email" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" placeholder="facilitator@example.com" />
          <TextField label="Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Minimum 8 characters" />
          {createError ? <Text style={{ color: colors.danger, fontSize: 13 }}>{createError}</Text> : null}
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
        <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Organisations</Text>
        <Text style={{ marginTop: 6, color: colors.textMuted }}>Create organisations and assign users to them.</Text>

        <View style={{ marginTop: 12, gap: 10 }}>
          <TextField label="Organisation name" value={orgName} onChangeText={setOrgName} placeholder="e.g., EduWave SA" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <TextField label="Province (optional)" value={orgProvince} onChangeText={setOrgProvince} placeholder="e.g., Gauteng" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="City (optional)" value={orgCity} onChangeText={setOrgCity} placeholder="e.g., Johannesburg" />
            </View>
          </View>
          {orgError ? <Text style={{ color: colors.danger, fontSize: 13 }}>{orgError}</Text> : null}
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

        <View style={{ marginTop: 12, gap: 10 }}>
          {selectedUser ? (
            <Card style={{ backgroundColor: colors.surfaceAlt }}>
              <Text style={{ color: colors.text, fontWeight: "900" }}>Assign organisation</Text>
              <Text style={{ marginTop: 6, color: colors.textMuted }}>{selectedUser.email}</Text>
              <Text style={{ marginTop: 6, color: colors.textMuted }}>{selectedUser.id}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
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
              <View style={{ gap: 10, marginTop: 10 }}>
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
              <Text style={{ color: colors.textMuted }}>Select a user below to assign an organisation.</Text>
            </Card>
          )}
        </View>
      </Card>

      <Card>
        <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Delete</Text>
        <Text style={{ marginTop: 6, color: colors.textMuted }}>Super admin can grant delete rights to specific admins.</Text>

        <View style={{ marginTop: 12, gap: 10 }}>
          {selectedUser ? (
            <>
              <Text style={{ color: colors.text, fontWeight: "900" }}>Selected user</Text>
              <Text style={{ color: colors.textMuted }}>{selectedUser.email}</Text>
              <Text style={{ color: colors.textMuted }}>{selectedUser.id}</Text>

              {isSuperAdmin ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: colors.text, fontWeight: "900" }}>
                    Delete permissions {loadingPermissions ? "(loading...)" : ""}
                  </Text>
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
                            borderColor: enabled ? colors.focusRing : colors.border,
                            borderWidth: enabled ? 2 : 1
                          }}
                        >
                          <Text style={{ color: colors.text, fontWeight: "900" }}>
                            {p.label}: {enabled ? "Yes" : "No"}
                          </Text>
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
            <Text style={{ color: colors.textMuted }}>Select a user to manage delete permissions and deletion.</Text>
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
              <Pressable onPress={() => setSelectedUser(item)} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
                <Card style={{ backgroundColor: colors.surfaceAlt }}>
                  <Text style={{ color: colors.text, fontWeight: "900" }}>{item.email}</Text>
                  <Text style={{ marginTop: 6, color: colors.textMuted }}>
                    {item.role}
                    {item.organisationId ? ` · ${orgNameById.get(item.organisationId) ?? item.organisationId}` : ""}
                  </Text>
                </Card>
              </Pressable>
            )}
          />

          <Text style={{ fontWeight: "900", color: colors.text }}>Facilitators</Text>
          <FlatList
            data={facilitators}
            scrollEnabled={false}
            keyExtractor={(u) => u.id}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => setSelectedUser(item)} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
                <Card style={{ backgroundColor: colors.surfaceAlt }}>
                  <Text style={{ color: colors.text, fontWeight: "900" }}>{item.email}</Text>
                  <Text style={{ marginTop: 6, color: colors.textMuted }}>
                    {item.id}
                    {item.organisationId ? ` · ${orgNameById.get(item.organisationId) ?? item.organisationId}` : ""}
                  </Text>
                </Card>
              </Pressable>
            )}
          />

          <Text style={{ fontWeight: "900", color: colors.text }}>Trainers / Supervisors</Text>
          <FlatList
            data={trainers}
            scrollEnabled={false}
            keyExtractor={(u) => u.id}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => setSelectedUser(item)} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
                <Card style={{ backgroundColor: colors.surfaceAlt }}>
                  <Text style={{ color: colors.text, fontWeight: "900" }}>{item.email}</Text>
                  <Text style={{ marginTop: 6, color: colors.textMuted }}>
                    {item.id}
                    {item.organisationId ? ` · ${orgNameById.get(item.organisationId) ?? item.organisationId}` : ""}
                  </Text>
                </Card>
              </Pressable>
            )}
          />

          <Text style={{ fontWeight: "900", color: colors.text }}>Organisation Admins</Text>
          <FlatList
            data={orgAdmins}
            scrollEnabled={false}
            keyExtractor={(u) => u.id}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => setSelectedUser(item)} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
                <Card style={{ backgroundColor: colors.surfaceAlt }}>
                  <Text style={{ color: colors.text, fontWeight: "900" }}>{item.email}</Text>
                  <Text style={{ marginTop: 6, color: colors.textMuted }}>
                    {item.id}
                    {item.organisationId ? ` · ${orgNameById.get(item.organisationId) ?? item.organisationId}` : ""}
                  </Text>
                </Card>
              </Pressable>
            )}
          />
        </View>
      </Card>
    </ScrollScreen>
  );
}
