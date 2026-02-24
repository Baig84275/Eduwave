import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { AdminPermission, Role } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { useToast } from "../ui/ToastProvider";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { TextField } from "../ui/TextField";
import { AppText } from "../ui/Text";
import { Badge } from "../ui/Badge";
import { Avatar } from "../ui/Avatar";
import { Divider } from "../ui/Divider";
import { ListItem } from "../ui/ListItem";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonListItem } from "../ui/Skeleton";
import { FadeInView } from "../animation/AnimatedComponents";

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminUser = {
  id: string;
  email: string;
  role: Role;
  organisationId?: string | null;
  deletedAt?: string | null;
  createdAt?: string;
};

type Org = {
  id: string;
  name: string;
  province?: string | null;
  city?: string | null;
  createdAt?: string;
};

type Tab = "users" | "orgs";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_CFG: Record<Role, { color: "primary" | "success" | "warning" | "danger" | "info" | "neutral"; label: string; icon: string }> = {
  PARENT:             { color: "neutral",  label: "Parent",          icon: "account"              },
  FACILITATOR:        { color: "primary",  label: "Facilitator",     icon: "account-heart"        },
  TEACHER:            { color: "info",     label: "Teacher",         icon: "school"               },
  THERAPIST:          { color: "info",     label: "Therapist",       icon: "medical-bag"          },
  TRAINER_SUPERVISOR: { color: "warning",  label: "Trainer",         icon: "account-star"         },
  ORG_ADMIN:          { color: "success",  label: "Org Admin",       icon: "office-building"      },
  ADMIN:              { color: "danger",   label: "Admin",           icon: "shield-account"       },
  SUPER_ADMIN:        { color: "danger",   label: "Super Admin",     icon: "shield-crown"         },
};

const ROLE_ORDER: Role[] = [
  "SUPER_ADMIN", "ADMIN", "ORG_ADMIN", "TRAINER_SUPERVISOR",
  "FACILITATOR", "TEACHER", "THERAPIST", "PARENT",
];

const ASSIGNABLE_ROLES: Role[] = [
  "FACILITATOR", "TEACHER", "THERAPIST", "TRAINER_SUPERVISOR",
  "ORG_ADMIN", "ADMIN",
];

const PERMISSIONS: { value: AdminPermission; label: string; icon: string }[] = [
  { value: "DELETE_USERS",    label: "Delete Users",    icon: "account-remove" },
  { value: "DELETE_CHILDREN", label: "Delete Children", icon: "delete"         },
];

// ─── Small helpers ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface + "CC", borderColor: "#FFFFFF22" }]}>
      <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      <AppText variant="h3" weight="black" style={{ color }}>{value}</AppText>
      <AppText variant="caption" style={{ color: "#BAE6FD", textAlign: "center" }}>{label}</AppText>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <MaterialCommunityIcons name={icon as any} size={14} color={colors.textMuted} />
      <AppText variant="caption" tone="muted" style={{ width: 88 }}>{label}</AppText>
      <AppText variant="caption" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{value}</AppText>
    </View>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function AdminTabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const TABS: { value: Tab; label: string; icon: string }[] = [
    { value: "users", label: "Users",         icon: "account-group"    },
    { value: "orgs",  label: "Organisations", icon: "office-building"  },
  ];
  return (
    <View style={[styles.tabBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      {TABS.map((t) => {
        const active_ = active === t.value;
        return (
          <Pressable
            key={t.value}
            onPress={() => onChange(t.value)}
            style={[styles.tabItem, active_ && { backgroundColor: colors.primary, borderRadius: 10 }]}
          >
            <MaterialCommunityIcons name={t.icon as any} size={16} color={active_ ? "#fff" : colors.textMuted} />
            <AppText variant="label" weight="semibold" style={{ color: active_ ? "#fff" : colors.textMuted }}>
              {t.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Role Picker ──────────────────────────────────────────────────────────────

function RolePicker({ selected, onSelect, includeSuper }: { selected: Role; onSelect: (r: Role) => void; includeSuper: boolean }) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const roles = includeSuper ? [...ASSIGNABLE_ROLES, "SUPER_ADMIN" as Role] : ASSIGNABLE_ROLES;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {roles.map((r) => {
        const active = selected === r;
        return (
          <Pressable
            key={r}
            onPress={() => onSelect(r)}
            style={[
              styles.rolePill,
              {
                backgroundColor: active ? colors.primary : colors.surfaceAlt,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <AppText variant="caption" weight="semibold" style={{ color: active ? "#fff" : colors.text }}>
              {ROLE_CFG[r].label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  return (
    <View style={[styles.searchBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search by email or role…"
        placeholderTextColor={colors.textMuted}
        style={[styles.searchInput, { color: colors.text }]}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChange("")}>
          <MaterialCommunityIcons name="close-circle" size={16} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

// ─── User Management Panel ────────────────────────────────────────────────────

type PanelSection = "info" | "role" | "org" | "perms";

function UserManagementPanel({
  user, orgs, orgNameById, isSuperAdmin, session, onDone, onRefresh,
}: {
  user: AdminUser;
  orgs: Org[];
  orgNameById: Map<string, string>;
  isSuperAdmin: boolean;
  session: any;
  onDone: () => void;
  onRefresh: () => Promise<void>;
}) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const toast = useToast();
  const cfg = ROLE_CFG[user.role];

  const [section, setSection] = useState<PanelSection>("info");
  const [perms, setPerms] = useState<AdminPermission[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [newRole, setNewRole] = useState<Role>(user.role);
  const [savingRole, setSavingRole] = useState(false);
  const [savingOrg, setSavingOrg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (section !== "perms" || !isSuperAdmin || !session) return;
    setLoadingPerms(true);
    api.get<{ permissions: Array<{ permission: AdminPermission }> }>(`/admin/users/${user.id}/permissions`, session)
      .then((r) => setPerms(r.permissions.map((p) => p.permission)))
      .catch(() => {})
      .finally(() => setLoadingPerms(false));
  }, [section, user.id, isSuperAdmin, session]);

  const saveRole = async () => {
    if (newRole === user.role) { setSection("info"); return; }
    setSavingRole(true);
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: newRole }, session);
      toast.success("Role updated", `${user.email} → ${ROLE_CFG[newRole].label}`);
      await onRefresh();
      onDone();
    } catch (e: any) {
      toast.error("Role change failed", e?.message);
    } finally {
      setSavingRole(false);
    }
  };

  const assignOrg = async (orgId: string | null) => {
    setSavingOrg(orgId ?? "__clear__");
    try {
      await api.patch(`/admin/users/${user.id}/organisation`, { organisationId: orgId }, session);
      toast.success("Organisation updated");
      await onRefresh();
      onDone();
    } catch (e: any) {
      toast.error("Failed", e?.message);
    } finally {
      setSavingOrg(null);
    }
  };

  const togglePerm = async (p: AdminPermission) => {
    const has = perms.includes(p);
    try {
      if (has) {
        await api.post("/admin/permissions/revoke", { userId: user.id, permission: p }, session);
        setPerms((prev) => prev.filter((x) => x !== p));
        toast.info("Permission revoked");
      } else {
        await api.post("/admin/permissions/grant", { userId: user.id, permission: p }, session);
        setPerms((prev) => [...prev, p]);
        toast.success("Permission granted");
      }
    } catch (e: any) {
      toast.error("Failed", e?.message);
    }
  };

  const deleteUser = async () => {
    setDeleting(true);
    try {
      await api.del(`/users/${user.id}`, session);
      toast.success("User deleted", user.email);
      await onRefresh();
      onDone();
    } catch (e: any) {
      toast.error("Delete failed", e?.message);
    } finally {
      setDeleting(false);
    }
  };

  const SECTIONS: { key: PanelSection; label: string; icon: string }[] = [
    { key: "info",  label: "Info",  icon: "information-outline" },
    { key: "role",  label: "Role",  icon: "account-cog"         },
    { key: "org",   label: "Org",   icon: "office-building"     },
    ...(isSuperAdmin ? [{ key: "perms" as PanelSection, label: "Perms", icon: "shield-key" }] : []),
  ];

  return (
    <Card variant="outlined" style={{ borderColor: colors.primary, borderWidth: 2 }}>
      {/* User header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <Avatar name={user.email} size="md" status={user.deletedAt ? "offline" : undefined} />
        <View style={{ flex: 1 }}>
          <AppText variant="label" weight="black" numberOfLines={1}>{user.email}</AppText>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            <Badge label={cfg.label} color={cfg.color} variant="subtle" size="sm" />
            {user.deletedAt ? <Badge label="Deleted" color="danger" variant="solid" size="sm" /> : null}
            {user.organisationId ? (
              <Badge label={orgNameById.get(user.organisationId) ?? "Org"} color="neutral" variant="subtle" size="sm" />
            ) : null}
          </View>
        </View>
        <Pressable onPress={onDone} style={{ padding: 6 }}>
          <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Section mini-tabs */}
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {SECTIONS.map((s) => {
          const active = section === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSection(s.key)}
              style={[
                styles.sectionPill,
                {
                  backgroundColor: active ? colors.primary + "22" : "transparent",
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <MaterialCommunityIcons name={s.icon as any} size={13} color={active ? colors.primary : colors.textMuted} />
              <AppText variant="caption" weight="semibold" style={{ color: active ? colors.primary : colors.textMuted }}>
                {s.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* Info */}
      {section === "info" && (
        <View style={{ gap: 8 }}>
          <InfoRow icon="identifier"     label="User ID"      value={user.id} />
          <InfoRow icon="calendar"       label="Created"      value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"} />
          <InfoRow icon="office-building" label="Organisation" value={user.organisationId ? (orgNameById.get(user.organisationId) ?? user.organisationId) : "None"} />
          {user.deletedAt ? <InfoRow icon="delete" label="Deleted at" value={new Date(user.deletedAt).toLocaleDateString()} /> : null}
          <Divider style={{ marginVertical: 8 }} />
          <AppButton
            title={deleting ? "Deleting…" : "Delete this user"}
            variant="danger"
            size="sm"
            loading={deleting}
            disabled={deleting}
            icon={<MaterialCommunityIcons name="account-remove" size={15} color="#fff" />}
            onPress={deleteUser}
            fullWidth
          />
        </View>
      )}

      {/* Role */}
      {section === "role" && (
        <View style={{ gap: 10 }}>
          <AppText variant="caption" tone="muted">Select new role:</AppText>
          <RolePicker selected={newRole} onSelect={setNewRole} includeSuper={isSuperAdmin} />
          {newRole !== user.role && (
            <AppButton
              title={savingRole ? "Saving…" : `Set to ${ROLE_CFG[newRole].label}`}
              variant="primary"
              size="sm"
              loading={savingRole}
              disabled={savingRole}
              onPress={saveRole}
              fullWidth
            />
          )}
        </View>
      )}

      {/* Org */}
      {section === "org" && (
        <View style={{ gap: 8 }}>
          <AppText variant="caption" tone="muted">
            Current: <AppText variant="caption" weight="semibold">
              {user.organisationId ? (orgNameById.get(user.organisationId) ?? "Unknown") : "None"}
            </AppText>
          </AppText>
          {user.organisationId && (
            <AppButton
              title={savingOrg === "__clear__" ? "Removing…" : "Remove from organisation"}
              variant="secondary"
              size="sm"
              loading={savingOrg === "__clear__"}
              disabled={savingOrg !== null}
              onPress={() => assignOrg(null)}
              fullWidth
            />
          )}
          <Divider label="ASSIGN TO" />
          {orgs.length === 0 ? (
            <AppText variant="caption" tone="muted">No organisations yet.</AppText>
          ) : (
            orgs.map((o) => (
              <AppButton
                key={o.id}
                title={savingOrg === o.id ? "Assigning…" : o.name}
                variant={user.organisationId === o.id ? "success" : "secondary"}
                size="sm"
                loading={savingOrg === o.id}
                disabled={savingOrg !== null || user.organisationId === o.id}
                icon={user.organisationId === o.id ? <MaterialCommunityIcons name="check" size={14} color="#fff" /> : undefined}
                onPress={() => assignOrg(o.id)}
                fullWidth
              />
            ))
          )}
        </View>
      )}

      {/* Permissions */}
      {section === "perms" && isSuperAdmin && (
        loadingPerms ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View style={{ gap: 8 }}>
            <AppText variant="caption" tone="muted">Toggle delete permissions for this admin:</AppText>
            {PERMISSIONS.map((p) => {
              const enabled = perms.includes(p.value);
              return (
                <Pressable key={p.value} onPress={() => togglePerm(p.value)}>
                  <Card
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderColor: enabled ? colors.success : colors.border,
                      borderWidth: enabled ? 2 : 1,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <MaterialCommunityIcons name={p.icon as any} size={18} color={enabled ? colors.success : colors.textMuted} />
                      <AppText variant="label" weight="semibold" style={{ color: enabled ? colors.success : colors.text }}>
                        {p.label}
                      </AppText>
                    </View>
                    <Badge label={enabled ? "Granted" : "Denied"} color={enabled ? "success" : "neutral"} variant="subtle" size="sm" />
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )
      )}
    </Card>
  );
}

// ─── Create User Form ─────────────────────────────────────────────────────────

function CreateUserForm({ session, isSuperAdmin, onCreated }: { session: any; isSuperAdmin: boolean; onCreated: () => Promise<void> }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("FACILITATOR");
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) { toast.warning("Required fields", "Email and password are required"); return; }
    if (password.length < 8) { toast.warning("Password too short", "Minimum 8 characters"); return; }
    setCreating(true);
    try {
      await api.post("/admin/users", { email: email.trim(), password, role }, session);
      toast.success("User created", `${email.trim()} · ${ROLE_CFG[role].label}`);
      setEmail(""); setPassword(""); setRole("FACILITATOR");
      await onCreated();
    } catch (e: any) {
      toast.error("Create failed", e?.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <AppText variant="caption" tone="muted">Select role:</AppText>
      <RolePicker selected={role} onSelect={setRole} includeSuper={isSuperAdmin} />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="user@example.com"
        leftIcon={<MaterialCommunityIcons name="email-outline" size={18} color="#94A3B8" />}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Min 8 characters"
        leftIcon={<MaterialCommunityIcons name="lock-outline" size={18} color="#94A3B8" />}
      />
      <AppButton
        title={creating ? "Creating…" : "Create user"}
        loading={creating}
        disabled={creating}
        onPress={submit}
        icon={<MaterialCommunityIcons name="account-plus" size={16} color="#fff" />}
        fullWidth
      />
    </View>
  );
}

// ─── Create Org Form ──────────────────────────────────────────────────────────

function CreateOrgForm({ session, onCreated }: { session: any; onCreated: () => Promise<void> }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.warning("Required", "Organisation name is required"); return; }
    setCreating(true);
    try {
      await api.post("/admin/organisations", { name: name.trim(), province: province.trim() || null, city: city.trim() || null }, session);
      toast.success("Organisation created", name.trim());
      setName(""); setProvince(""); setCity("");
      await onCreated();
    } catch (e: any) {
      toast.error("Create failed", e?.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g., EduWave SA" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><TextField label="Province" value={province} onChangeText={setProvince} placeholder="Optional" /></View>
        <View style={{ flex: 1 }}><TextField label="City" value={city} onChangeText={setCity} placeholder="Optional" /></View>
      </View>
      <AppButton
        title={creating ? "Creating…" : "Create organisation"}
        loading={creating}
        disabled={creating}
        onPress={submit}
        icon={<MaterialCommunityIcons name="office-building-plus" size={16} color="#fff" />}
        fullWidth
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function AdminDashboardScreen() {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "SUPER_ADMIN";
  const isSuperAdmin = session?.user.role === "SUPER_ADMIN";

  const loadUsers = useCallback(async () => {
    if (!session) return;
    setLoadingUsers(true);
    try {
      const qs = includeDeleted ? "?includeDeleted=true" : "";
      const res = await api.get<{ users: AdminUser[] }>(`/admin/users${qs}`, session);
      setUsers(res.users);
    } catch (e: any) {
      toast.error("Failed to load users", e?.message);
    } finally {
      setLoadingUsers(false);
    }
  }, [session, includeDeleted, toast]);

  const loadOrgs = useCallback(async () => {
    if (!session) return;
    setLoadingOrgs(true);
    try {
      const res = await api.get<{ organisations: Org[] }>("/admin/organisations", session);
      setOrgs(res.organisations);
    } catch (e: any) {
      toast.error("Failed to load organisations", e?.message);
    } finally {
      setLoadingOrgs(false);
    }
  }, [session, toast]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);
  useEffect(() => { void loadOrgs(); }, [loadOrgs]);

  const orgNameById = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.organisationId && (orgNameById.get(u.organisationId) ?? "").toLowerCase().includes(q))
    );
  }, [users, search, orgNameById]);

  const grouped = useMemo(() => {
    return ROLE_ORDER.flatMap((role) => {
      const list = filteredUsers.filter((u) => u.role === role);
      return list.length ? [{ role, users: list }] : [];
    });
  }, [filteredUsers]);

  const stats = useMemo(() => ({
    total: users.filter((u) => !u.deletedAt).length,
    facilitators: users.filter((u) => u.role === "FACILITATOR" && !u.deletedAt).length,
    orgsCount: orgs.length,
  }), [users, orgs]);

  if (!isAdmin) {
    return (
      <ScrollScreen>
        <EmptyState title="Admin only" message="This area is restricted to Admin and Super Admin accounts." />
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      {/* ── Gradient header ── */}
      <LinearGradient colors={["#0E7490", "#164E63"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <MaterialCommunityIcons name="shield-crown" size={22} color="#E0F2FE" />
          <AppText variant="h2" weight="black" tone="white">Admin Dashboard</AppText>
        </View>
        <AppText variant="caption" style={{ color: "#BAE6FD", marginBottom: 16 }}>
          {isSuperAdmin ? "Super Admin · Full access" : "Admin · User & org management"}
        </AppText>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard icon="account-group"  label="Active Users"   value={stats.total}       color="#38BDF8" />
          <StatCard icon="account-heart"  label="Facilitators"   value={stats.facilitators} color="#A78BFA" />
          <StatCard icon="office-building" label="Organisations"  value={stats.orgsCount}   color="#34D399" />
        </View>
      </LinearGradient>

      {/* ── Tabs ── */}
      <AdminTabBar active={tab} onChange={(t) => { setTab(t); setSelectedUser(null); }} />

      {/* ══ USERS TAB ══ */}
      {tab === "users" && (
        <FadeInView key="users-tab">
          <View style={{ gap: 12 }}>

            {/* Search + refresh */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <SearchBar value={search} onChange={setSearch} />
              </View>
              <AppButton
                title=""
                variant="ghost"
                size="sm"
                loading={loadingUsers}
                icon={<MaterialCommunityIcons name="refresh" size={18} color={colors.textMuted} />}
                onPress={() => void loadUsers()}
              />
            </View>

            {/* Filter chips */}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Pressable
                onPress={() => setIncludeDeleted((v) => !v)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: includeDeleted ? colors.danger + "22" : colors.surfaceAlt,
                    borderColor: includeDeleted ? colors.danger : colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={includeDeleted ? "eye" : "eye-off-outline"}
                  size={14}
                  color={includeDeleted ? colors.danger : colors.textMuted}
                />
                <AppText variant="caption" weight="semibold" style={{ color: includeDeleted ? colors.danger : colors.textMuted }}>
                  {includeDeleted ? "Showing deleted" : "Hide deleted"}
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => { setShowCreateUser((v) => !v); setSelectedUser(null); }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: showCreateUser ? colors.primary + "22" : colors.surfaceAlt,
                    borderColor: showCreateUser ? colors.primary : colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={showCreateUser ? "close" : "account-plus"}
                  size={14}
                  color={showCreateUser ? colors.primary : colors.textMuted}
                />
                <AppText variant="caption" weight="semibold" style={{ color: showCreateUser ? colors.primary : colors.textMuted }}>
                  {showCreateUser ? "Cancel" : "Create user"}
                </AppText>
              </Pressable>
            </View>

            {/* Create user form */}
            {showCreateUser && (
              <FadeInView>
                <Card variant="outlined" style={{ borderColor: colors.primary, borderWidth: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <MaterialCommunityIcons name="account-plus-outline" size={18} color={colors.primary} />
                    <AppText variant="body" weight="black">New User</AppText>
                  </View>
                  <CreateUserForm
                    session={session}
                    isSuperAdmin={isSuperAdmin}
                    onCreated={async () => { setShowCreateUser(false); await loadUsers(); }}
                  />
                </Card>
              </FadeInView>
            )}

            {/* Selected user panel */}
            {selectedUser && (
              <FadeInView>
                <UserManagementPanel
                  user={selectedUser}
                  orgs={orgs}
                  orgNameById={orgNameById}
                  isSuperAdmin={isSuperAdmin}
                  session={session}
                  onDone={() => setSelectedUser(null)}
                  onRefresh={loadUsers}
                />
              </FadeInView>
            )}

            {/* User list */}
            {loadingUsers && users.length === 0 ? (
              <Card><View style={{ gap: 8 }}>{[1, 2, 3, 4].map((i) => <SkeletonListItem key={i} />)}</View></Card>
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                title={search ? "No results" : "No users"}
                message={search ? `No users match "${search}"` : "No users found"}
              />
            ) : (
              <Card>
                <View style={{ gap: 16 }}>
                  {grouped.map(({ role, users: groupUsers }, idx) => {
                    const cfg = ROLE_CFG[role];
                    return (
                      <View key={role}>
                        {idx > 0 && <Divider style={{ marginBottom: 12 }} />}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <MaterialCommunityIcons name={cfg.icon as any} size={14} color={colors.textMuted} />
                          <AppText variant="caption" weight="black" tone="muted">{cfg.label.toUpperCase()}</AppText>
                          <Badge label={String(groupUsers.length)} color={cfg.color} variant="subtle" size="sm" />
                        </View>
                        {groupUsers.map((u) => (
                          <ListItem
                            key={u.id}
                            title={u.email}
                            subtitle={
                              u.organisationId
                                ? (orgNameById.get(u.organisationId) ?? "Organisation")
                                : "No organisation"
                            }
                            selected={selectedUser?.id === u.id}
                            onPress={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                            leftContent={<Avatar name={u.email} size="sm" status={u.deletedAt ? "offline" : undefined} />}
                            rightContent={
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                {u.deletedAt ? <Badge label="Deleted" color="danger" variant="subtle" size="sm" /> : null}
                                <MaterialCommunityIcons
                                  name={selectedUser?.id === u.id ? "chevron-up" : "chevron-down"}
                                  size={18}
                                  color={colors.textMuted}
                                />
                              </View>
                            }
                            showChevron={false}
                          />
                        ))}
                      </View>
                    );
                  })}
                </View>
              </Card>
            )}
          </View>
        </FadeInView>
      )}

      {/* ══ ORGS TAB ══ */}
      {tab === "orgs" && (
        <FadeInView key="orgs-tab">
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() => setShowCreateOrg((v) => !v)}
              style={[
                styles.chip,
                {
                  alignSelf: "flex-start",
                  backgroundColor: showCreateOrg ? colors.primary + "22" : colors.surfaceAlt,
                  borderColor: showCreateOrg ? colors.primary : colors.border,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={showCreateOrg ? "close" : "office-building-plus"}
                size={14}
                color={showCreateOrg ? colors.primary : colors.textMuted}
              />
              <AppText variant="caption" weight="semibold" style={{ color: showCreateOrg ? colors.primary : colors.textMuted }}>
                {showCreateOrg ? "Cancel" : "New organisation"}
              </AppText>
            </Pressable>

            {showCreateOrg && (
              <FadeInView>
                <Card variant="outlined" style={{ borderColor: colors.primary, borderWidth: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <MaterialCommunityIcons name="office-building-plus" size={18} color={colors.primary} />
                    <AppText variant="body" weight="black">New Organisation</AppText>
                  </View>
                  <CreateOrgForm
                    session={session}
                    onCreated={async () => { setShowCreateOrg(false); await loadOrgs(); }}
                  />
                </Card>
              </FadeInView>
            )}

            {loadingOrgs && orgs.length === 0 ? (
              <Card><View style={{ gap: 8 }}>{[1, 2].map((i) => <SkeletonListItem key={i} />)}</View></Card>
            ) : orgs.length === 0 ? (
              <EmptyState title="No organisations" message="Create your first organisation above." />
            ) : (
              <View style={{ gap: 8 }}>
                {orgs.map((o) => {
                  const memberCount = users.filter((u) => u.organisationId === o.id && !u.deletedAt).length;
                  return (
                    <Card key={o.id} variant="elevated" elevation="sm">
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={[styles.orgIcon, { backgroundColor: colors.info + "22" }]}>
                          <MaterialCommunityIcons name="office-building" size={22} color={colors.info} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <AppText variant="body" weight="black">{o.name}</AppText>
                          {(o.province || o.city) ? (
                            <AppText variant="caption" tone="muted">
                              {[o.city, o.province].filter(Boolean).join(", ")}
                            </AppText>
                          ) : null}
                          {o.createdAt ? (
                            <AppText variant="caption" tone="muted">
                              Created {new Date(o.createdAt).toLocaleDateString()}
                            </AppText>
                          ) : null}
                        </View>
                        <Badge
                          label={`${memberCount} member${memberCount !== 1 ? "s" : ""}`}
                          color="primary"
                          variant="subtle"
                          size="sm"
                        />
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        </FadeInView>
      )}
    </ScrollScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 4,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    gap: 3,
  },
  sectionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  orgIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
