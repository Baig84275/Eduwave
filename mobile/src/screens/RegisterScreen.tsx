import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AuthStackParamList } from "../navigation/AuthStack";
import { api } from "../api/client";
import { Organisation } from "../api/types";
import { AppButton } from "../ui/Button";
import { TextField } from "../ui/TextField";
import { AppText } from "../ui/Text";
import { Divider } from "../ui/Divider";
import { FadeInView, StaggeredItem } from "../animation/AnimatedComponents";
import { tokens } from "../theme/tokens";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;
type Role = "PARENT" | "FACILITATOR" | "TEACHER" | "THERAPIST";

const ROLES: { id: Role; label: string; icon: string; description: string }[] = [
  { id: "PARENT",      label: "Parent",      icon: "account-child-outline", description: "For families"         },
  { id: "FACILITATOR", label: "Facilitator", icon: "account-group-outline", description: "Community leader"     },
  { id: "TEACHER",     label: "Teacher",     icon: "school-outline",        description: "Educator"             },
  { id: "THERAPIST",   label: "Therapist",   icon: "stethoscope",           description: "Support professional" },
];

// Role-specific label shown on the org picker trigger
const ORG_LABEL: Record<Exclude<Role, "PARENT">, string> = {
  FACILITATOR: "Organisation",
  TEACHER:     "School or Institution",
  THERAPIST:   "Practice or Organisation",
};

export function RegisterScreen({ navigation, route }: Props) {
  const { register } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const invitationToken = route.params?.invitationToken;
  const [email,        setEmail]        = useState(route.params?.prefillEmail ?? "");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role,         setRole]         = useState<Role>(route.params?.prefillRole ?? "PARENT");
  const [error,        setError]        = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);

  // Org picker state
  const [orgs,          setOrgs]          = useState<Organisation[]>([]);
  const [orgsLoading,   setOrgsLoading]   = useState(false);
  const [pickerOpen,    setPickerOpen]    = useState(false);
  const [orgSearch,     setOrgSearch]     = useState("");
  const [selectedOrg,   setSelectedOrg]   = useState<Organisation | null>(null);

  // Load org list whenever a professional role is selected
  useEffect(() => {
    if (role === "PARENT") {
      setSelectedOrg(null);
      return;
    }
    setOrgsLoading(true);
    api
      .get<{ organisations: Organisation[] }>("/org")
      .then((res) => setOrgs(res.organisations))
      .catch(() => {})
      .finally(() => setOrgsLoading(false));
  }, [role]);

  // Reset org if user switches back to Parent
  useEffect(() => {
    if (role === "PARENT") setSelectedOrg(null);
  }, [role]);

  // Hide native header — custom hero handles it
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Filtered org list for search
  const filteredOrgs = orgs.filter((o) => {
    const q = orgSearch.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      (o.city?.toLowerCase().includes(q) ?? false) ||
      (o.province?.toLowerCase().includes(q) ?? false)
    );
  });

  // Password strength
  const passwordStrength = (() => {
    if (!password) return null;
    if (password.length < 6)  return { level: 0, label: "Too short", color: colors.danger  };
    if (password.length < 8)  return { level: 1, label: "Weak",      color: colors.warning };
    if (password.length < 12 && !/[^a-zA-Z0-9]/.test(password))
                               return { level: 2, label: "Fair",      color: colors.warning };
    return                            { level: 3, label: "Strong",    color: colors.success };
  })();

  const handleCreate = useCallback(async () => {
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!password || password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError(null);
    try {
      await register(email.trim(), password, role, invitationToken, selectedOrg?.id);
    } catch (e: any) {
      setError(e?.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, password, role, invitationToken, selectedOrg, register]);

  const orgLabel = role !== "PARENT" ? ORG_LABEL[role as Exclude<Role, "PARENT">] : "";

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* ── HERO ────────────────────────────────────── */}
          <LinearGradient
            colors={[colors.gradientEnd, colors.gradientStart]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={[styles.circle1, { backgroundColor: "rgba(255,255,255,0.07)" }]} />
            <View style={[styles.circle2, { backgroundColor: "rgba(255,255,255,0.05)" }]} />
            <View style={[styles.circle3, { backgroundColor: "rgba(255,255,255,0.04)" }]} />

            <FadeInView style={styles.heroContent}>
              <Pressable
                onPress={() => navigation.navigate("Login")}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Back to login"
                style={styles.backButton}
              >
                <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
              </Pressable>
              <View style={styles.logoWrapper}>
                <MaterialCommunityIcons name="account-plus-outline" size={36} color={colors.gradientStart} />
              </View>
              <AppText variant="h2" weight="black" style={{ color: "#fff" }}>Join EduWave</AppText>
              <AppText variant="body" style={{ color: "rgba(255,255,255,0.85)" }}>Create your account in seconds</AppText>
            </FadeInView>
          </LinearGradient>

          {/* ── FORM CARD ───────────────────────────────── */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                ...Platform.select({
                  ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: -4 } },
                  android: { elevation: 8 },
                }),
              },
            ]}
          >
            <View style={{ marginBottom: tokens.spacing.xs }}>
              <AppText variant="h3" weight="black" style={{ color: colors.text }}>Create account</AppText>
              <AppText variant="body" tone="muted" style={{ marginTop: tokens.spacing.xs }}>
                Choose your role and fill in your details
              </AppText>
            </View>

            {/* ── ROLE PICKER ─────────────────────────── */}
            <View style={{ gap: tokens.spacing.sm }}>
              <AppText style={styles.sectionLabel}>I am a…</AppText>
              <View style={styles.roleGrid}>
                {ROLES.map((r, index) => {
                  const active = role === r.id;
                  return (
                    <StaggeredItem key={r.id} index={index} staggerDelay={40} style={styles.roleCell}>
                      <Pressable
                        onPress={() => setRole(r.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${r.label}. ${r.description}`}
                        style={({ pressed }) => [
                          styles.roleChip,
                          {
                            borderColor: active ? colors.primary : colors.border,
                            borderWidth: active ? 2 : 1,
                            backgroundColor: active ? colors.primaryLight : colors.surfaceAlt,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.roleIconWrapper, { backgroundColor: active ? colors.primary : colors.surfaceElevated }]}>
                          <MaterialCommunityIcons name={r.icon as any} size={22} color={active ? "#fff" : colors.textMuted} />
                        </View>
                        <AppText variant="label" weight="bold" style={{ color: active ? colors.primaryDark : colors.text, textAlign: "center" }}>
                          {r.label}
                        </AppText>
                        <AppText variant="caption" style={{ color: active ? colors.primaryDark : colors.textMuted, textAlign: "center", opacity: 0.85 }}>
                          {r.description}
                        </AppText>
                        {active && (
                          <View style={styles.roleCheck}>
                            <MaterialCommunityIcons name="check-circle" size={16} color={colors.primary} />
                          </View>
                        )}
                      </Pressable>
                    </StaggeredItem>
                  );
                })}
              </View>
            </View>

            <Divider style={{ marginVertical: tokens.spacing.xs }} />

            {/* ── ORG PICKER TRIGGER (non-Parent roles only) ── */}
            {role !== "PARENT" && (
              <View style={{ gap: tokens.spacing.xs }}>
                <AppText style={styles.sectionLabel}>{orgLabel}</AppText>
                <Pressable
                  onPress={() => { setOrgSearch(""); setPickerOpen(true); }}
                  accessibilityRole="button"
                  accessibilityLabel={selectedOrg ? `Selected: ${selectedOrg.name}. Tap to change.` : `Select ${orgLabel}`}
                  style={({ pressed }) => [
                    styles.orgTrigger,
                    {
                      backgroundColor: selectedOrg ? colors.primaryLight : colors.surfaceAlt,
                      borderColor: selectedOrg ? colors.primary : colors.border,
                      borderWidth: selectedOrg ? 2 : 1,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {/* Left icon */}
                  <View style={[styles.orgTriggerIcon, { backgroundColor: selectedOrg ? colors.primary : colors.surfaceElevated }]}>
                    {orgsLoading ? (
                      <MaterialCommunityIcons name="loading" size={20} color={colors.textMuted} />
                    ) : (
                      <MaterialCommunityIcons
                        name={selectedOrg ? "domain" : "domain-plus"}
                        size={20}
                        color={selectedOrg ? "#fff" : colors.textMuted}
                      />
                    )}
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1 }}>
                    {selectedOrg ? (
                      <>
                        <AppText variant="label" weight="bold" style={{ color: colors.primaryDark }}>
                          {selectedOrg.name}
                        </AppText>
                        {(selectedOrg.city || selectedOrg.province) && (
                          <AppText variant="caption" style={{ color: colors.primaryDark, opacity: 0.75 }}>
                            {[selectedOrg.city, selectedOrg.province].filter(Boolean).join(", ")}
                          </AppText>
                        )}
                      </>
                    ) : (
                      <AppText variant="body" style={{ color: colors.textMuted }}>
                        {orgsLoading ? "Loading…" : `Select ${orgLabel} (optional)`}
                      </AppText>
                    )}
                  </View>

                  {/* Right indicator */}
                  {selectedOrg ? (
                    <Pressable
                      onPress={() => setSelectedOrg(null)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel="Clear organisation"
                    >
                      <MaterialCommunityIcons name="close-circle" size={20} color={colors.primaryDark} />
                    </Pressable>
                  ) : (
                    <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
                  )}
                </Pressable>
              </View>
            )}

            {/* ── FIELDS ──────────────────────────────── */}
            <TextField
              label="Email address"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              leftIcon={<MaterialCommunityIcons name="email-outline" size={20} color={colors.textMuted} />}
            />

            <View style={{ gap: tokens.spacing.xs }}>
              <TextField
                label="Password"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                returnKeyType="done"
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                leftIcon={<MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} />}
                rightIcon={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                }
                onSubmitEditing={handleCreate}
              />
              {passwordStrength && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBarTrack}>
                    {[0, 1, 2].map((i) => (
                      <View
                        key={i}
                        style={[styles.strengthBarSegment, { backgroundColor: i <= passwordStrength.level - 1 ? passwordStrength.color : colors.borderLight }]}
                      />
                    ))}
                  </View>
                  <AppText variant="caption" style={{ color: passwordStrength.color, fontWeight: "600" }}>
                    {passwordStrength.label}
                  </AppText>
                </View>
              )}
            </View>

            {/* Error */}
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
                <AppText variant="caption" tone="danger" weight="semibold" style={{ flex: 1 }}>{error}</AppText>
              </View>
            ) : null}

            {/* Create button */}
            <AppButton
              title={loading ? "Creating account…" : "Create account"}
              variant="gradient"
              loading={loading}
              disabled={loading}
              icon={!loading ? <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" /> : undefined}
              iconPosition="right"
              onPress={handleCreate}
            />

            <Divider label="or" style={{ marginVertical: tokens.spacing.xs }} />

            <AppButton
              title="Sign in to existing account"
              variant="secondary"
              icon={<MaterialCommunityIcons name="login" size={18} color={colors.primary} />}
              onPress={() => navigation.navigate("Login")}
            />

            <AppText variant="caption" tone="muted" style={{ textAlign: "center", paddingHorizontal: tokens.spacing.md }}>
              By creating an account you agree to our Terms of Service and Privacy Policy.
            </AppText>
          </View>

          <View style={styles.footer}>
            <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
              EduWave Village © {new Date().getFullYear()}
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── ORG PICKER MODAL ──────────────────────────── */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerOpen(false)}
      >
        <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="h3" weight="black" style={{ color: colors.text }}>
                Select {orgLabel}
              </AppText>
              <AppText variant="caption" tone="muted">
                Search by name, city, or province
              </AppText>
            </View>
            <Pressable
              onPress={() => setPickerOpen(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={[styles.modalClose, { backgroundColor: colors.surfaceAlt }]}
            >
              <MaterialCommunityIcons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Search input */}
          <View style={[styles.modalSearch, { borderBottomColor: colors.borderLight }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} style={{ marginRight: tokens.spacing.sm }} />
            <TextField
              label=""
              floatingLabel={false}
              value={orgSearch}
              onChangeText={setOrgSearch}
              placeholder="Search organisations…"
              variant="filled"
              containerStyle={{ flex: 1 }}
              autoFocus
            />
          </View>

          {/* List */}
          <FlatList
            data={filteredOrgs}
            keyExtractor={(o) => o.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: tokens.spacing.xl }}
            ListHeaderComponent={
              /* "No organisation" row */
              <Pressable
                onPress={() => { setSelectedOrg(null); setPickerOpen(false); }}
                style={({ pressed }) => [
                  styles.orgRow,
                  {
                    backgroundColor: !selectedOrg ? colors.primaryLight : pressed ? colors.surfacePressed : colors.surface,
                    borderBottomColor: colors.borderLight,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="No organisation"
              >
                <View style={[styles.orgRowIcon, { backgroundColor: !selectedOrg ? colors.primary : colors.surfaceElevated }]}>
                  <MaterialCommunityIcons name="close-circle-outline" size={20} color={!selectedOrg ? "#fff" : colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" weight="bold" style={{ color: !selectedOrg ? colors.primaryDark : colors.text }}>
                    No organisation
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textMuted }}>Skip this step</AppText>
                </View>
                {!selectedOrg && <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />}
              </Pressable>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="domain-off" size={40} color={colors.textMuted} />
                <AppText variant="body" tone="muted" style={{ textAlign: "center", marginTop: tokens.spacing.sm }}>
                  {orgSearch ? `No results for "${orgSearch}"` : "No organisations found"}
                </AppText>
              </View>
            }
            renderItem={({ item }) => {
              const active = selectedOrg?.id === item.id;
              return (
                <Pressable
                  onPress={() => { setSelectedOrg(item); setPickerOpen(false); }}
                  style={({ pressed }) => [
                    styles.orgRow,
                    {
                      backgroundColor: active ? colors.primaryLight : pressed ? colors.surfacePressed : colors.surface,
                      borderBottomColor: colors.borderLight,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${item.name}${item.city ? `, ${item.city}` : ""}`}
                >
                  <View style={[styles.orgRowIcon, { backgroundColor: active ? colors.primary : colors.surfaceElevated }]}>
                    <MaterialCommunityIcons name="domain" size={20} color={active ? "#fff" : colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" weight="bold" style={{ color: active ? colors.primaryDark : colors.text }}>
                      {item.name}
                    </AppText>
                    {(item.city || item.province) && (
                      <AppText variant="caption" style={{ color: active ? colors.primaryDark : colors.textMuted, opacity: 0.85 }}>
                        {[item.city, item.province].filter(Boolean).join(", ")}
                      </AppText>
                    )}
                  </View>
                  {active && <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Hero
  hero: { height: 240, justifyContent: "flex-end", overflow: "hidden" },
  heroContent: { padding: tokens.spacing.xl, paddingBottom: tokens.spacing.xxxl, gap: tokens.spacing.xs },
  backButton: {
    width: 36, height: 36, borderRadius: tokens.radius.full,
    backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center",
    marginBottom: tokens.spacing.md,
  },
  logoWrapper: {
    width: 60, height: 60, borderRadius: tokens.radius.xl,
    backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center",
    marginBottom: tokens.spacing.sm,
  },
  circle1: { position: "absolute", width: 200, height: 200, borderRadius: 100, top: -50, right: -40 },
  circle2: { position: "absolute", width: 120, height: 120, borderRadius: 60, top: 30, right: 70 },
  circle3: { position: "absolute", width: 80, height: 80, borderRadius: 40, bottom: 20, left: -20 },

  // Card
  card: {
    marginTop: -36, marginHorizontal: tokens.spacing.lg, marginBottom: tokens.spacing.lg,
    borderRadius: tokens.radius.xxl, borderWidth: 1, padding: tokens.spacing.xl, gap: tokens.spacing.md,
  },

  // Role picker
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: "#64748B", textTransform: "uppercase" },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.sm },
  roleCell: { width: "47%" },
  roleChip: { alignItems: "center", padding: tokens.spacing.md, borderRadius: tokens.radius.lg, gap: tokens.spacing.xs, position: "relative" },
  roleIconWrapper: { width: 44, height: 44, borderRadius: tokens.radius.md, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  roleCheck: { position: "absolute", top: 8, right: 8 },

  // Org trigger button
  orgTrigger: {
    flexDirection: "row", alignItems: "center", gap: tokens.spacing.md,
    padding: tokens.spacing.md, borderRadius: tokens.radius.lg, minHeight: 56,
  },
  orgTriggerIcon: { width: 40, height: 40, borderRadius: tokens.radius.md, alignItems: "center", justifyContent: "center" },

  // Password strength
  strengthRow: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm, paddingHorizontal: 2 },
  strengthBarTrack: { flex: 1, flexDirection: "row", gap: 4 },
  strengthBarSegment: { flex: 1, height: 4, borderRadius: 2 },

  // Error
  errorBanner: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm, padding: tokens.spacing.md, borderRadius: tokens.radius.md, borderWidth: 1 },

  // Footer
  footer: { padding: tokens.spacing.xl, paddingTop: 0, alignItems: "center" },

  // Modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row", alignItems: "flex-start", padding: tokens.spacing.xl,
    paddingBottom: tokens.spacing.md, borderBottomWidth: 1, gap: tokens.spacing.md,
  },
  modalClose: { width: 36, height: 36, borderRadius: tokens.radius.full, alignItems: "center", justifyContent: "center" },
  modalSearch: { flexDirection: "row", alignItems: "center", paddingHorizontal: tokens.spacing.lg, paddingVertical: tokens.spacing.sm, borderBottomWidth: 1 },
  orgRow: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.md, paddingHorizontal: tokens.spacing.lg, paddingVertical: tokens.spacing.md, borderBottomWidth: 1 },
  orgRowIcon: { width: 40, height: 40, borderRadius: tokens.radius.md, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", paddingTop: tokens.spacing.xxxl },
});
