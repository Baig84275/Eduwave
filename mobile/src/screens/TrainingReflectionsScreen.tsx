import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { TrainingReflection } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
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

type Props = NativeStackScreenProps<MainStackParamList, "TrainingReflections">;

export function TrainingReflectionsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [items, setItems] = useState<TrainingReflection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ reflections: TrainingReflection[] }>("/training/reflections?limit=50&offset=0", session);
      setItems(res.reflections);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load reflections");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const grouped = useMemo(() => {
    const byCourse: Record<string, TrainingReflection[]> = {};
    for (const r of items) {
      byCourse[r.courseId] = byCourse[r.courseId] ?? [];
      byCourse[r.courseId].push(r);
    }
    return Object.entries(byCourse).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  return (
    <ScrollScreen>
      <FadeInView>
        <View style={{ gap: 16 }}>
          <ScreenHeader
            title="Training Journey"
            subtitle="Your reflections over time."
          />

          {error ? <InlineAlert tone="danger" text={error} /> : null}

          {loading ? (
            <View style={{ gap: 12 }}>{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</View>
          ) : items.length === 0 ? (
            <EmptyState
              title="No reflections yet"
              message="Complete a training module to submit your first reflection."
            />
          ) : (
            grouped.map(([courseId, reflections], groupIndex) => (
              <SlideInView key={courseId} direction="up" delay={groupIndex * 80}>
                <View style={{ gap: 10 }}>
                  <Divider label={`COURSE ${courseId}`} />
                  {reflections.map((r, index) => {
                    const isExpanded = expandedId === r.id;
                    const cc = typeof r.confidenceChange === "number" ? r.confidenceChange : null;
                    const ccColor = cc == null ? colors.textMuted : cc > 0 ? colors.success : cc < 0 ? colors.danger : colors.warning;

                    return (
                      <Card
                        key={r.id}
                        pressable
                        onPress={() => setExpandedId(isExpanded ? null : r.id)}
                        variant="elevated"
                        elevation="sm"
                      >
                        <View style={{ gap: 8 }}>
                          {/* Header row */}
                          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                            <View style={{ flex: 1 }}>
                              <AppText variant="body" weight="bold" numberOfLines={2}>{r.moduleName}</AppText>
                              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                                {new Date(r.createdAt).toLocaleDateString()}
                              </AppText>
                            </View>
                            <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                              {typeof r.helpfulRating === "number" ? (
                                <Badge
                                  label={String(r.helpfulRating)}
                                  color="warning"
                                  variant="subtle"
                                  size="sm"
                                  icon={<MaterialCommunityIcons name="star" size={12} color={colors.warning} />}
                                />
                              ) : null}
                              {cc != null ? (
                                <Badge
                                  label={`${cc > 0 ? "+" : ""}${cc}`}
                                  color={cc > 0 ? "success" : cc < 0 ? "danger" : "warning"}
                                  variant="subtle"
                                  size="sm"
                                  icon={<MaterialCommunityIcons name="chart-line" size={12} color={ccColor} />}
                                />
                              ) : null}
                              <MaterialCommunityIcons
                                name={isExpanded ? "chevron-up" : "chevron-down"}
                                size={18}
                                color={colors.textMuted}
                              />
                            </View>
                          </View>

                          {/* Expanded content */}
                          {isExpanded && (
                            <>
                              <Divider />
                              <View style={{ gap: 12 }}>
                                <View style={{ gap: 4 }}>
                                  <AppText variant="label" weight="bold" tone="muted">WHAT DID YOU LEARN?</AppText>
                                  <AppText variant="body">{r.reflectionText}</AppText>
                                </View>
                                <View style={{ gap: 4 }}>
                                  <AppText variant="label" weight="bold" tone="muted">HOW DID YOU APPLY IT?</AppText>
                                  <AppText variant="body">{r.applicationNote}</AppText>
                                </View>
                                {r.challengesFaced ? (
                                  <View style={{ gap: 4 }}>
                                    <AppText variant="label" weight="bold" tone="muted">CHALLENGES</AppText>
                                    <AppText variant="body">{r.challengesFaced}</AppText>
                                  </View>
                                ) : null}
                                {r.supportNeeded ? (
                                  <View style={{ gap: 4 }}>
                                    <AppText variant="label" weight="bold" tone="muted">SUPPORT NEEDED</AppText>
                                    <AppText variant="body">{r.supportNeeded}</AppText>
                                  </View>
                                ) : null}
                              </View>
                            </>
                          )}
                        </View>
                      </Card>
                    );
                  })}
                </View>
              </SlideInView>
            ))
          )}

          <AppButton
            title="Refresh"
            variant="secondary"
            loading={loading}
            icon={<MaterialCommunityIcons name="refresh" size={18} color={colors.textMuted} />}
            onPress={() => void load()}
          />
        </View>
      </FadeInView>
    </ScrollScreen>
  );
}
