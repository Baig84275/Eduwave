import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Linking, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { TrainingCompletionStatus, TrainingModuleItem } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { TrainingStackParamList } from "../navigation/stacks/TrainingStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { ScreenHeader } from "../ui/ScreenHeader";
import { AppText } from "../ui/Text";
import { InlineAlert } from "../ui/InlineAlert";
import { Badge } from "../ui/Badge";
import { Divider } from "../ui/Divider";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonCard } from "../ui/Skeleton";
import { FadeInView, SlideInView } from "../animation/AnimatedComponents";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<TrainingStackParamList, "TrainingHub">;

const STATUS_BADGE: Record<TrainingCompletionStatus, { color: "neutral" | "info" | "success"; label: string; icon: string }> = {
  NOT_STARTED: { color: "neutral", label: "Not started", icon: "circle-outline" },
  IN_PROGRESS: { color: "info",    label: "In progress", icon: "progress-clock"  },
  COMPLETED:   { color: "success", label: "Completed",   icon: "check-circle"    },
};

export function TrainingHubScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [modules, setModules] = useState<TrainingModuleItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ modules: TrainingModuleItem[] }>("/training/my-modules", session);
      setModules(res.modules);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const setStatus = async (item: TrainingModuleItem, status: TrainingCompletionStatus) => {
    if (!session) return;
    setError(null);
    try {
      await api.post("/training/completions", { moduleId: item.module.id, status }, session);
      await load();
      if (status === "COMPLETED") {
        navigation.navigate("TrainingReflection", {
          moduleId: item.module.id,
          courseId: item.module.courseId,
          moduleName: item.module.moduleName,
        });
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to update");
    }
  };

  const completedCount = modules.filter((m) => m.status === "COMPLETED").length;
  const inProgressCount = modules.filter((m) => m.status === "IN_PROGRESS").length;

  return (
    <ScrollScreen>
      <FadeInView>
        <View style={{ gap: 16 }}>
          <ScreenHeader
            title="Training"
            subtitle="Links-only training tracking. No hosting, quizzes, assessments, or certificates."
          />

          {error ? <InlineAlert tone="danger" text={error} /> : null}

          {/* Stats bar */}
          {modules.length > 0 && (
            <SlideInView direction="up" delay={80}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Card style={{ flex: 1 }} variant="solid">
                  <AppText variant="h2" weight="black">{modules.length}</AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>Assigned</AppText>
                </Card>
                <Card style={{ flex: 1 }} variant="solid">
                  <AppText variant="h2" weight="black" style={{ color: colors.info }}>{inProgressCount}</AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>In progress</AppText>
                </Card>
                <Card style={{ flex: 1 }} variant="solid">
                  <AppText variant="h2" weight="black" style={{ color: colors.success }}>{completedCount}</AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>Completed</AppText>
                </Card>
              </View>
            </SlideInView>
          )}

          {/* Quick actions */}
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <AppButton
              title="My Reflections"
              variant="secondary"
              icon={<MaterialCommunityIcons name="book-open-outline" size={18} color={colors.textMuted} />}
              onPress={() => navigation.navigate("TrainingReflections")}
            />
            <AppButton
              title="Refresh"
              variant="ghost"
              loading={loading}
              icon={<MaterialCommunityIcons name="refresh" size={18} color={colors.textMuted} />}
              onPress={() => void load()}
            />
          </View>

          <Divider label={loading ? "LOADING..." : `${modules.length} MODULES`} />

          {/* Module list */}
          {loading ? (
            <View style={{ gap: 12 }}>{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</View>
          ) : modules.length === 0 ? (
            <EmptyState
              title="No training modules assigned"
              message="Your trainer will assign modules here. Check back soon."
            />
          ) : (
            <View style={{ gap: 12 }}>
              {modules.map((item, index) => {
                const statusCfg = STATUS_BADGE[item.status] ?? STATUS_BADGE.NOT_STARTED;
                return (
                  <SlideInView key={item.module.id} direction="up" delay={index * 60}>
                    <Card variant="elevated" elevation="md">
                      <View style={{ gap: 10 }}>
                        {/* Header */}
                        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                          <View style={{ flex: 1 }}>
                            <AppText variant="body" weight="bold" numberOfLines={2}>{item.module.moduleName}</AppText>
                            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                              Course {item.module.courseId}
                              {item.completedAt ? ` · Completed ${new Date(item.completedAt).toLocaleDateString()}` : ""}
                            </AppText>
                          </View>
                          <Badge label={statusCfg.label} color={statusCfg.color} variant="subtle" size="sm" />
                        </View>

                        <Divider />

                        {/* Actions */}
                        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                          <AppButton
                            title="Open module"
                            size="sm"
                            icon={<MaterialCommunityIcons name="open-in-new" size={16} color="#fff" />}
                            onPress={() => void Linking.openURL(item.module.lmsUrl)}
                          />
                          {item.status !== "IN_PROGRESS" && (
                            <AppButton
                              title="Mark in progress"
                              variant="secondary"
                              size="sm"
                              icon={<MaterialCommunityIcons name="progress-clock" size={16} color={colors.textMuted} />}
                              onPress={() => void setStatus(item, "IN_PROGRESS")}
                            />
                          )}
                          {item.status !== "COMPLETED" && (
                            <AppButton
                              title="Mark completed"
                              variant="success"
                              size="sm"
                              icon={<MaterialCommunityIcons name="check" size={16} color="#fff" />}
                              onPress={() => void setStatus(item, "COMPLETED")}
                            />
                          )}
                        </View>
                      </View>
                    </Card>
                  </SlideInView>
                );
              })}
            </View>
          )}
        </View>
      </FadeInView>
    </ScrollScreen>
  );
}
