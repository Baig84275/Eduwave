import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../api/client";
import { TrainingCompletionStatus, TrainingModuleItem } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { TrainingStackParamList } from "../navigation/stacks/TrainingStack";
import { AppText } from "../ui/Text";
import { tokens } from "../theme/tokens";

type Props = NativeStackScreenProps<TrainingStackParamList, "TrainingHub">;

const PURPLE = "#6B4FA0";
const LEARN_TABS = ["My courses", "Browse", "Certificates"] as const;
type LearnTab = (typeof LEARN_TABS)[number];

function getModuleStatus(status: TrainingCompletionStatus) {
  switch (status) {
    case "COMPLETED":   return { label: "Done",        bg: "#E5F5EE", color: "#2A7E52", dotBg: PURPLE,    dotColor: "#fff" };
    case "IN_PROGRESS": return { label: "In progress", bg: "#FEF3E8", color: "#C4680F", dotBg: "#E8F5E9", dotColor: "#3A9E6F" };
    default:            return { label: "Upcoming",    bg: "#f0f0f0", color: "#999",    dotBg: "#F0EBF8", dotColor: PURPLE };
  }
}

export function TrainingHubScreen({ navigation }: Props) {
  const { session } = useAuth();

  const [modules, setModules] = useState<TrainingModuleItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<LearnTab>("My courses");

  const load = useCallback(async (refresh = false) => {
    if (!session) return;
    if (refresh) setRefreshing(true);
    try {
      const res = await api.get<{ modules: TrainingModuleItem[] }>("/training/my-modules", session);
      setModules(res.modules);
    } catch {
      /* swallow */
    } finally {
      setRefreshing(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const completed   = modules.filter((m) => m.status === "COMPLETED");
  const inProgress  = modules.filter((m) => m.status === "IN_PROGRESS");
  const totalPct    = modules.length ? Math.round((completed.length / modules.length) * 100) : 0;
  const currentIdx  = inProgress.length ? modules.indexOf(inProgress[0]) + 1 : completed.length + 1;

  const openModule = (mod: TrainingModuleItem) => {
    if (mod.module.lmsUrl) Linking.openURL(mod.module.lmsUrl).catch(() => {});
    else navigation.navigate("TrainingCourses");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Purple header */}
      <View style={styles.header}>
        <AppText style={styles.headerTitle}>Training &amp; Courses</AppText>
        <AppText style={styles.headerSub}>Grow your knowledge. Change a child's life.</AppText>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {LEARN_TABS.map((tab) => (
          <Pressable key={tab} style={styles.tabItem} onPress={() => setActiveTab(tab)}>
            <AppText style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
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
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={PURPLE} colors={[PURPLE]} />
        }
      >
        {activeTab === "My courses" && (
          <>
            {/* Progress summary card */}
            {modules.length > 0 && (
              <View style={styles.progressCard}>
                <AppText style={styles.progressLabel}>Currently enrolled</AppText>
                <AppText style={styles.progressTitle}>
                  {(modules[0] as any)?.courseName ?? "Level 1 Facilitator Course"}
                </AppText>
                <View style={styles.progressBarOuter}>
                  <View style={[styles.progressBarInner, { width: `${totalPct}%` as any }]} />
                </View>
                <AppText style={styles.progressMeta}>
                  {totalPct}% complete · Module {currentIdx} of {modules.length}
                </AppText>
              </View>
            )}

            {/* Module list */}
            <AppText style={styles.sectionTitle}>Modules</AppText>
            {modules.map((mod, i) => {
              const s = getModuleStatus(mod.status);
              const num = i + 1;
              const isCurrent = mod.status === "IN_PROGRESS";
              return (
                <Pressable
                  key={mod.module.id}
                  style={[styles.modCard, isCurrent && styles.modCardCurrent]}
                  onPress={() => openModule(mod)}
                >
                  <View style={[styles.modNum, { backgroundColor: s.dotBg }, isCurrent && styles.modNumCurrent]}>
                    <AppText style={[styles.modNumText, { color: s.dotColor }]}>{num}</AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.modName}>{mod.module.moduleName}</AppText>
                    {mod.module.lmsUrl ? (
                      <AppText style={styles.modSub} numberOfLines={1}>{mod.module.lmsUrl}</AppText>
                    ) : null}
                  </View>
                  <View style={[styles.modBadge, { backgroundColor: s.bg }]}>
                    <AppText style={[styles.modBadgeText, { color: s.color }]}>{s.label}</AppText>
                  </View>
                </Pressable>
              );
            })}

            {modules.length === 0 && (
              <View style={styles.empty}>
                <AppText style={{ fontSize: 36, marginBottom: 8 }}>🎓</AppText>
                <AppText style={styles.emptyTitle}>No modules yet</AppText>
                <AppText style={styles.emptyDesc}>Your training modules will appear here once assigned.</AppText>
                <Pressable style={styles.browseBtn} onPress={() => navigation.navigate("TrainingCourses")}>
                  <AppText style={styles.browseBtnText}>Browse courses</AppText>
                </Pressable>
              </View>
            )}
          </>
        )}

        {activeTab === "Browse" && (
          <View style={styles.empty}>
            <AppText style={{ fontSize: 36, marginBottom: 8 }}>📚</AppText>
            <AppText style={styles.emptyTitle}>Course catalogue</AppText>
            <AppText style={styles.emptyDesc}>Explore all available courses and modules.</AppText>
            <Pressable style={styles.browseBtn} onPress={() => navigation.navigate("TrainingCourses")}>
              <AppText style={styles.browseBtnText}>View courses</AppText>
            </Pressable>
          </View>
        )}

        {activeTab === "Certificates" && (
          <View style={styles.empty}>
            <AppText style={{ fontSize: 36, marginBottom: 8 }}>🏅</AppText>
            <AppText style={styles.emptyTitle}>Certificates</AppText>
            <AppText style={styles.emptyDesc}>
              Complete {completed.length > 0 ? "more " : ""}modules to earn certificates.{" "}
            </AppText>
            {completed.length > 0 && (
              <AppText style={{ color: "#3A9E6F", fontWeight: "700", marginTop: 8 }}>
                {completed.length} module{completed.length !== 1 ? "s" : ""} completed
              </AppText>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: PURPLE,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.lg,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 9, position: "relative" },
  tabLabel: { fontSize: 11, fontWeight: "600", color: "#999" },
  tabLabelActive: { color: PURPLE, fontWeight: "700" },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: "15%",
    right: "15%",
    height: 2,
    backgroundColor: PURPLE,
    borderRadius: 2,
  },
  progressCard: {
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#e4e4e4",
    borderRadius: 11,
    margin: tokens.spacing.md,
    marginBottom: 0,
    padding: 12,
  },
  progressLabel: { fontSize: 9, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 },
  progressTitle: { fontSize: 13, fontWeight: "600", color: PURPLE, marginBottom: 6 },
  progressBarOuter: { height: 7, backgroundColor: "#f0f0f0", borderRadius: 6, overflow: "hidden" },
  progressBarInner: { height: "100%", backgroundColor: PURPLE, borderRadius: 6 },
  progressMeta: { fontSize: 9, color: PURPLE, fontWeight: "700", marginTop: 4 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1A1A2E",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: 12,
    paddingBottom: 5,
  },
  modCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: tokens.spacing.md,
    marginBottom: 5,
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#e4e4e4",
    borderRadius: 11,
    padding: 10,
  },
  modCardCurrent: { borderColor: PURPLE, borderWidth: 1 },
  modNum: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  modNumCurrent: {},
  modNumText: { fontSize: 10, fontWeight: "700" },
  modName: { fontSize: 12, fontWeight: "600", color: "#1A1A2E" },
  modSub: { fontSize: 9, color: "#888", marginTop: 2 },
  modBadge: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3, flexShrink: 0 },
  modBadgeText: { fontSize: 8, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 48, paddingHorizontal: tokens.spacing.xl },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E", marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20 },
  browseBtn: {
    marginTop: 16,
    backgroundColor: PURPLE,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  browseBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
