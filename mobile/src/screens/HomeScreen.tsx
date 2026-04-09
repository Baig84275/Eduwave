import React, { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { api } from "../api/client";
import { Child } from "../api/types";
import { HomeStackParamList } from "../navigation/stacks/HomeStack";
import { AppText } from "../ui/Text";
import { tokens } from "../theme/tokens";

type Nav = NativeStackNavigationProp<HomeStackParamList>;

const PRIMARY = "#007B8A";
const DARK = "#1A1A2E";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

function QuickAction({
  emoji,
  label,
  bg,
  onPress,
}: {
  emoji: string;
  label: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.quickBtn, { backgroundColor: bg }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <AppText style={{ fontSize: 20 }}>{emoji}</AppText>
      <AppText style={styles.quickLabel} numberOfLines={2}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [children, setChildren] = useState<Child[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const firstName =
    (session?.user as any)?.name?.split(" ")[0] ||
    session?.user.email?.split("@")[0] ||
    "there";
  const userRole = session?.user.role || "PARENT";
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "TRAINER_SUPERVISOR", "ORG_ADMIN"].includes(userRole);

  const fetchChildren = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      try {
        const res = await api.get<{ children: Child[] }>("/children", session);
        setChildren(res.children);
      } catch {
        /* silent — home screen isn't critical */
      } finally {
        setRefreshing(false);
      }
    },
    [session]
  );

  useFocusEffect(
    useCallback(() => {
      fetchChildren();
    }, [fetchChildren])
  );

  // Navigate to another tab using the parent TabNavigator
  const goToTab = (tabName: string) => {
    (navigation as any).getParent()?.navigate(tabName);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchChildren(true)} tintColor={PRIMARY} />
        }
      >
        {/* ── HERO BAND ─────────────────────────────────── */}
        <LinearGradient
          colors={["#007B8A", "#005F6B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBand}
        >
          <View style={styles.heroLeft}>
            <AppText style={styles.greet}>{getGreeting()}</AppText>
            <AppText style={styles.heroName}>{firstName} 👋</AppText>
            <AppText style={styles.heroSub}>Your village is here for you</AppText>
          </View>
          {isAdmin && (
            <Pressable
              style={styles.adminBadge}
              onPress={() => navigation.navigate(
                userRole === "TRAINER_SUPERVISOR" ? "TrainerDashboard" :
                userRole === "ORG_ADMIN" ? "OrgOverview" : "Dashboard"
              )}
            >
              <MaterialCommunityIcons name="view-dashboard-outline" size={16} color="#fff" />
              <AppText style={{ color: "#fff", fontSize: 10, fontWeight: "700", marginLeft: 4 }}>
                Dashboard
              </AppText>
            </Pressable>
          )}
        </LinearGradient>

        {/* ── QUICK ACTIONS ──────────────────────────────── */}
        <View style={styles.quickRow}>
          <QuickAction emoji="📍" label="Find a service" bg="#E0F4F7" onPress={() => goToTab("ResourcesTab")} />
          <QuickAction emoji="📊" label="Log update" bg="#FEF3E8" onPress={() => goToTab("TrackerTab")} />
          <QuickAction emoji="♿" label="Accessibility" bg="#F0EBF8" onPress={() => navigation.navigate("AccessibilitySettings" as any)} />
          <QuickAction emoji="🆘" label="Emergency" bg="#FFEBEE" onPress={() => goToTab("SosTab")} />
        </View>

        {/* ── CHILD UPDATES ─────────────────────────────── */}
        {children.length > 0 && (
          <>
            <AppText style={[styles.sectionTitle, { color: DARK }]}>
              {children[0]?.name ? `${children[0].name}'s latest updates` : "Latest updates"}
            </AppText>
            {children.slice(0, 1).map((child) => (
              <Pressable
                key={child.id}
                style={[styles.card, { borderColor: colors.border }]}
                onPress={() => goToTab("TrackerTab")}
              >
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: "#FEF3E8" }]}>
                    <AppText style={{ fontSize: 18 }}>👤</AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.cardTitle}>{child.name}</AppText>
                    <AppText style={styles.cardSub}>
                      {(child as any).dateOfBirth
                        ? `${new Date().getFullYear() - new Date((child as any).dateOfBirth).getFullYear()} years`
                        : "Child profile"}
                      {(child as any).diagnoses?.length
                        ? ` · ${(child as any).diagnoses.slice(0, 2).join(", ")}`
                        : ""}
                    </AppText>
                    <View style={styles.badge}>
                      <AppText style={styles.badgeText}>View profile</AppText>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#bbb" />
                </View>
              </Pressable>
            ))}
          </>
        )}

        {/* ── RECOMMENDED NEAR YOU ──────────────────────── */}
        <AppText style={[styles.sectionTitle, { color: DARK }]}>Recommended near you</AppText>
        <Pressable style={[styles.card, { borderColor: colors.border }]} onPress={() => goToTab("ResourcesTab")}>
          <View style={styles.cardRow}>
            <View style={[styles.cardIcon, { backgroundColor: "#E0F4F7" }]}>
              <AppText style={{ fontSize: 18 }}>🧠</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.cardTitle}>Cape Town Sensory Gym</AppText>
              <AppText style={styles.cardSub}>Observatory · 2.3km away</AppText>
              <View style={[styles.badge, { backgroundColor: "#E0F4F7" }]}>
                <AppText style={[styles.badgeText, { color: PRIMARY }]}>Special needs friendly</AppText>
              </View>
            </View>
          </View>
        </Pressable>

        {/* ── COURSE PROGRESS ───────────────────────────── */}
        {["FACILITATOR", "TEACHER", "THERAPIST", "TRAINER_SUPERVISOR"].includes(userRole) && (
          <>
            <AppText style={[styles.sectionTitle, { color: DARK }]}>Course progress</AppText>
            <Pressable style={[styles.card, { borderColor: colors.border }]} onPress={() => goToTab("LearnTab")}>
              <AppText style={{ fontSize: 11, fontWeight: "600", color: "#6B4FA0", marginBottom: 6 }}>
                Level 1 Facilitator Course
              </AppText>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: "60%", backgroundColor: "#6B4FA0" }]} />
              </View>
              <AppText style={{ fontSize: 9, color: "#888", marginTop: 4 }}>
                Module 6 of 10 · 60% complete
              </AppText>
            </Pressable>
          </>
        )}

        {/* ── PROFILE SHORTCUTS ─────────────────────────── */}
        <View style={styles.profileRow}>
          <Pressable
            style={styles.profileBtn}
            onPress={() => navigation.navigate("Profile" as any)}
          >
            <MaterialCommunityIcons name="account-circle-outline" size={18} color={PRIMARY} />
            <AppText style={[styles.profileBtnText, { color: PRIMARY }]}>My Profile</AppText>
          </Pressable>
          <Pressable
            style={styles.profileBtn}
            onPress={() => navigation.navigate("AccessibilitySettings" as any)}
          >
            <MaterialCommunityIcons name="tune-variant" size={18} color="#6B4FA0" />
            <AppText style={[styles.profileBtnText, { color: "#6B4FA0" }]}>Settings</AppText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroBand: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xl,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  heroLeft: { flex: 1 },
  greet: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginBottom: 2 },
  heroName: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 2 },
  heroSub: { fontSize: 10, color: "rgba(255,255,255,0.8)" },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: tokens.spacing.sm,
    marginTop: 2,
  },
  quickRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.xs,
  },
  quickBtn: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    gap: 4,
  },
  quickLabel: {
    fontSize: 8,
    color: PRIMARY,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 11,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: 12,
    paddingBottom: 5,
  },
  card: {
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderRadius: 13,
    padding: 12,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: { fontSize: 12, fontWeight: "600", color: "#1A1A2E" },
  cardSub: { fontSize: 10, color: "#888", marginTop: 2 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#E0F4F7",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 4,
  },
  badgeText: { fontSize: 8, fontWeight: "700", color: PRIMARY },
  progressBar: {
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 6 },
  profileRow: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
  },
  profileBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#E4E4E4",
    borderRadius: 11,
    paddingVertical: 10,
  },
  profileBtnText: { fontSize: 11, fontWeight: "600" },
});
