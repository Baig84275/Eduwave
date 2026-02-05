import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { TrainingReflection } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

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
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>Training journey</Text>
        <Text style={{ color: colors.textMuted }}>Your reflections over time.</Text>

        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
        <Text style={{ color: colors.textMuted }}>{loading ? "Loading..." : `${items.length} reflections`}</Text>

        {grouped.map(([courseId, reflections]) => (
          <View key={courseId} style={{ gap: 10 }}>
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>Course: {courseId}</Text>
            {reflections.map((r) => {
              const isExpanded = expandedId === r.id;
              const cc = typeof r.confidenceChange === "number" ? r.confidenceChange : null;
              const ccColor = cc == null ? colors.textMuted : cc > 0 ? "#16A34A" : cc < 0 ? "#DC2626" : "#F59E0B";
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setExpandedId(isExpanded ? null : r.id)}
                  style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                >
                  <Card>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: "900" }}>{r.moduleName}</Text>
                        <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                          {new Date(r.createdAt).toLocaleDateString()}{" "}
                          {cc != null ? `· Confidence ${cc > 0 ? "+" : ""}${cc}` : ""}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        {typeof r.helpfulRating === "number" ? (
                          <>
                            <MaterialCommunityIcons name="star" size={18} color="#F59E0B" />
                            <Text style={{ color: colors.textMuted, fontWeight: "900" }}>{r.helpfulRating}</Text>
                          </>
                        ) : null}
                        {cc != null ? <MaterialCommunityIcons name="chart-line" size={18} color={ccColor} /> : null}
                      </View>
                    </View>

                    {isExpanded ? (
                      <View style={{ gap: 10, marginTop: 12 }}>
                        <View>
                          <Text style={{ color: colors.text, fontWeight: "900" }}>What did you learn?</Text>
                          <Text style={{ color: colors.text, marginTop: 6 }}>{r.reflectionText}</Text>
                        </View>
                        <View>
                          <Text style={{ color: colors.text, fontWeight: "900" }}>How did you apply it?</Text>
                          <Text style={{ color: colors.text, marginTop: 6 }}>{r.applicationNote}</Text>
                        </View>
                        {r.challengesFaced ? (
                          <View>
                            <Text style={{ color: colors.text, fontWeight: "900" }}>Challenges</Text>
                            <Text style={{ color: colors.text, marginTop: 6 }}>{r.challengesFaced}</Text>
                          </View>
                        ) : null}
                        {r.supportNeeded ? (
                          <View>
                            <Text style={{ color: colors.text, fontWeight: "900" }}>Support needed</Text>
                            <Text style={{ color: colors.text, marginTop: 6 }}>{r.supportNeeded}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ))}

        <AppButton title="Refresh" variant="secondary" onPress={() => void load()} />
        <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </ScrollScreen>
  );
}

