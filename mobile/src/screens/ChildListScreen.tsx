import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { api } from "../api/client";
import { Child } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ChildrenStackParamList } from "../navigation/stacks/ChildrenStack";
import { AppText } from "../ui/Text";
import { tokens } from "../theme/tokens";

type Nav = NativeStackNavigationProp<ChildrenStackParamList>;

const ORANGE = "#F4861E";
const DARK = "#1A1A2E";

const TABS = ["Overview", "Log", "Goals", "Team"] as const;
type TrackerTab = (typeof TABS)[number];


export function ChildListScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [children, setChildren] = useState<Child[]>([]);
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TrackerTab>("Overview");

  const isParent = session?.user.role === "PARENT";

  const fetchChildren = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);
        const res = await api.get<{ children: Child[] }>("/children", session);
        setChildren(res.children);
      } catch {
        /* swallow */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session]
  );

  useFocusEffect(useCallback(() => { fetchChildren(); }, [fetchChildren]));

  const firstChild = children[0];

  function getAge(dob?: string) {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Orange header */}
      <View style={styles.header}>
        <AppText style={styles.headerTitle}>Child Progress Tracker</AppText>
        <AppText style={styles.headerSub}>
          {firstChild ? `${firstChild.name}'s team` : "Your children"} · {children.length} {children.length === 1 ? "child" : "children"}
        </AppText>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab)}
          >
            <AppText
              style={[
                styles.tabLabel,
                activeTab === tab && styles.tabLabelActive,
              ]}
            >
              {tab}
            </AppText>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchChildren(true)}
            tintColor={ORANGE}
            colors={[ORANGE]}
          />
        }
      >
        {activeTab === "Overview" && (
          <>
            {/* Empty state when no children */}
            {children.length === 0 && (
              <View style={styles.emptyTab}>
                <AppText style={{ fontSize: 40, marginBottom: 12 }}>👶</AppText>
                <AppText style={styles.emptyTitle}>
                  {isParent ? "No children yet" : "No children assigned"}
                </AppText>
                <AppText style={styles.emptyDesc}>
                  {isParent
                    ? "Add your first child profile to start tracking progress."
                    : "Children assigned to you will appear here."}
                </AppText>
                {isParent && (
                  <Pressable
                    style={[styles.addBtn, { marginTop: 16 }]}
                    onPress={() => navigation.navigate("CreateChild")}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                    <AppText style={styles.addBtnText}>Add first child profile</AppText>
                  </Pressable>
                )}
              </View>
            )}

            {/* Child card */}
            {children.map((child) => {
              const age = getAge((child as any).dateOfBirth);
              const initials = child.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Pressable
                  key={child.id}
                  style={styles.childCard}
                  onPress={() => navigation.navigate("Child", { childId: child.id })}
                >
                  <View style={styles.childTop}>
                    <View style={styles.avatar}>
                      <AppText style={styles.avatarText}>{initials}</AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.childName}>{child.name}</AppText>
                      <AppText style={styles.childSub}>
                        {age != null ? `${age} years` : ""}
                        {(child as any).diagnoses?.length
                          ? ` · ${(child as any).diagnoses.slice(0, 2).join(", ")}`
                          : ""}
                      </AppText>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#bbb" />
                  </View>
                  {(child as any).teamSummary ? (
                    <AppText style={styles.teamLabel}>Team: {(child as any).teamSummary}</AppText>
                  ) : null}
                </Pressable>
              );
            })}

            {/* Add child */}
            {isParent && (
              <Pressable
                style={styles.addBtn}
                onPress={() => navigation.navigate("CreateChild")}
              >
                <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                <AppText style={styles.addBtnText}>
                  {children.length === 0 ? "Add first child profile" : "Add another child"}
                </AppText>
              </Pressable>
            )}

            {/* Upload panel */}
            {firstChild && (
              <View style={styles.uploadPanel}>
                <AppText style={styles.uploadTitle}>Upload files, videos or documents</AppText>
                <View style={styles.uploadRow}>
                  {[
                    { emoji: "🎬", label: "Video" },
                    { emoji: "🖼️", label: "Photo" },
                    { emoji: "📄", label: "Doc/Report" },
                    { emoji: "📋", label: "Assessment" },
                  ].map((item) => (
                    <Pressable
                      key={item.label}
                      style={styles.uploadBtn}
                      onPress={() => navigation.navigate("UploadMedia", { childId: firstChild.id })}
                    >
                      <AppText style={{ fontSize: 18 }}>{item.emoji}</AppText>
                      <AppText style={styles.uploadLabel}>{item.label}</AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* View full timeline */}
            {firstChild && (
              <>
                <AppText style={styles.sectionTitle}>Progress timeline</AppText>
                <Pressable
                  style={styles.logCard}
                  onPress={() => navigation.navigate("Child", { childId: firstChild.id })}
                >
                  <View style={styles.logTop}>
                    <AppText style={styles.logWho}>{firstChild.name}</AppText>
                    <AppText style={styles.logTime}>View all →</AppText>
                  </View>
                  <AppText style={styles.logText}>Tap to view progress updates, media and notes.</AppText>
                </Pressable>
              </>
            )}

            {/* Add entry */}
            {firstChild && (
              <Pressable
                style={styles.addEntryBtn}
                onPress={() => navigation.navigate("AddUpdate", { childId: firstChild.id })}
              >
                <AppText style={styles.addEntryText}>+ Add entry</AppText>
              </Pressable>
            )}
          </>
        )}

        {activeTab === "Log" && (
          <View style={styles.emptyTab}>
            <AppText style={{ fontSize: 32, marginBottom: 8 }}>📋</AppText>
            <AppText style={styles.emptyTitle}>Log entries</AppText>
            <AppText style={styles.emptyDesc}>All progress updates will appear here.</AppText>
            {firstChild && (
              <Pressable
                style={styles.addBtn}
                onPress={() => navigation.navigate("AddUpdate", { childId: firstChild.id })}
              >
                <AppText style={styles.addBtnText}>+ Add entry</AppText>
              </Pressable>
            )}
          </View>
        )}

        {activeTab === "Goals" && (
          <View style={styles.emptyTab}>
            <AppText style={{ fontSize: 32, marginBottom: 8 }}>🎯</AppText>
            <AppText style={styles.emptyTitle}>Goals</AppText>
            <AppText style={styles.emptyDesc}>Track progress goals for each child.</AppText>
          </View>
        )}

        {activeTab === "Team" && (
          <View style={styles.emptyTab}>
            <AppText style={{ fontSize: 32, marginBottom: 8 }}>👥</AppText>
            <AppText style={styles.emptyTitle}>Team</AppText>
            <AppText style={styles.emptyDesc}>View all team members connected to this child.</AppText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    backgroundColor: ORANGE,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.lg,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    position: "relative",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
  },
  tabLabelActive: {
    color: ORANGE,
    fontWeight: "700",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: "15%",
    right: "15%",
    height: 2,
    backgroundColor: ORANGE,
    borderRadius: 2,
  },
  childCard: {
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#e4e4e4",
    borderRadius: 13,
    margin: tokens.spacing.md,
    marginBottom: 0,
    padding: 12,
  },
  childTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF3E8",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#C4680F" },
  childName: { fontSize: 14, fontWeight: "700", color: DARK },
  childSub: { fontSize: 10, color: "#888", marginTop: 2 },
  teamLabel: { fontSize: 9, color: "#888", marginTop: 6 },
addBtn: {
    backgroundColor: ORANGE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 11,
    paddingVertical: 10,
    marginHorizontal: tokens.spacing.md,
    marginTop: tokens.spacing.md,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  uploadPanel: {
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#e4e4e4",
    borderRadius: 13,
    margin: tokens.spacing.md,
    marginBottom: 0,
    padding: 12,
  },
  uploadTitle: { fontSize: 11, fontWeight: "700", color: DARK, marginBottom: 8 },
  uploadRow: { flexDirection: "row", gap: 6 },
  uploadBtn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f8f8f8",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#ddd",
    borderRadius: 9,
    paddingVertical: 10,
  },
  uploadLabel: { fontSize: 8, fontWeight: "600", color: "#555", textAlign: "center", lineHeight: 12 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: DARK,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: 12,
    paddingBottom: 5,
  },
  logCard: {
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#e4e4e4",
    borderRadius: 11,
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
    padding: 10,
  },
  logTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  logWho: { fontSize: 9, fontWeight: "700", color: ORANGE },
  logTime: { fontSize: 8, color: "#aaa" },
  logText: { fontSize: 10, color: "#444", lineHeight: 15 },
  logMeta: { fontSize: 8, color: "#888", marginTop: 3 },
  addEntryBtn: {
    backgroundColor: ORANGE,
    borderRadius: 11,
    paddingVertical: 10,
    marginHorizontal: tokens.spacing.md,
    marginTop: tokens.spacing.sm,
    alignItems: "center",
  },
  addEntryText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  emptyTab: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: tokens.spacing.xl,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: DARK, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20 },
});
