import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { MyTrainingCourse } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";
import { AppText } from "../ui/Text";
import { EmptyState } from "../ui/EmptyState";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<MainStackParamList, "TrainingCourses">;

export function TrainingCoursesScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [courses, setCourses] = useState<MyTrainingCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ courses: MyTrainingCourse[] }>("/training/my-courses", session);
      setCourses(res.courses);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
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
    const byLevel = new Map<number, MyTrainingCourse[]>();
    for (const c of courses) {
      const level = c.course.levelNumber ?? 0;
      byLevel.set(level, [...(byLevel.get(level) ?? []), c]);
    }
    return Array.from(byLevel.entries()).sort((a, b) => a[0] - b[0]);
  }, [courses]);

  return (
    <ScrollScreen>
      <View style={{ gap: 12 }}>
        <ScreenHeader title="Training" subtitle="Link-based tracking. This app does not host training content." />

        {error ? <InlineAlert tone="danger" text={error} /> : null}
        <AppText variant="caption" tone="muted">
          {loading ? "Loading..." : `${courses.length} courses assigned`}
        </AppText>

        {!courses.length && !loading ? (
          <EmptyState title="No training assigned yet" message="A trainer will assign your training when you are ready." />
        ) : null}

        {grouped.map(([level, levelCourses]) => (
          <View key={String(level)} style={{ gap: 10 }}>
            <AppText variant="label" weight="black">
              {level > 0 ? `Level ${level}` : "Courses"}
            </AppText>

            {levelCourses.map((item) => {
              const completedCount = item.modules.filter((m) => m.completionStatus === "COMPLETED").length;
              const total = item.modules.length;

              return (
                <Card key={item.course.id}>
                  <AppText variant="body" weight="black">
                    {item.course.title}
                  </AppText>
                  {item.course.description ? (
                    <AppText variant="body" tone="muted" style={{ marginTop: 6 }}>
                      {item.course.description}
                    </AppText>
                  ) : null}

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                    <AppText variant="caption" tone="muted">
                      Progress: {completedCount}/{total}
                    </AppText>
                    <Pressable
                      onPress={() => void Linking.openURL(item.course.learnworldsUrl)}
                      style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                    >
                      <Card style={{ backgroundColor: colors.primary }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <MaterialCommunityIcons name="open-in-new" size={18} color="#FFFFFF" />
                          <AppText variant="label" tone="white" weight="bold">
                            Open in LearnWorlds
                          </AppText>
                        </View>
                      </Card>
                    </Pressable>
                  </View>

                  <View style={{ gap: 8, marginTop: 12 }}>
                    <AppText variant="label" weight="black">
                      Modules
                    </AppText>

                    {item.modules.map((m) => {
                      const isCompleted = m.completionStatus === "COMPLETED";
                      const busy = completingId === m.id;
                      return (
                        <Pressable
                          key={m.id}
                          disabled={busy || isCompleted}
                          onPress={async () => {
                            if (!session) return;
                            setCompletingId(m.id);
                            setError(null);
                            try {
                              await api.post("/training/complete-module", { moduleId: m.id }, session);
                              await load();
                            } catch (e: any) {
                              setError(e?.message ?? "Failed to update");
                            } finally {
                              setCompletingId(null);
                            }
                          }}
                          style={({ pressed }) => [
                            {
                              opacity: busy || isCompleted ? 0.7 : pressed ? config.motion.pressFeedbackOpacity : 1
                            }
                          ]}
                        >
                          <Card style={{ backgroundColor: isCompleted ? colors.surfaceAlt : colors.surface }}>
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                              <View style={{ flex: 1 }}>
                                <AppText variant="body" weight={isCompleted ? "semibold" : "black"}>
                                  {m.moduleName}
                                </AppText>
                                {isCompleted && m.completionDate ? (
                                  <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                                    Completed: {new Date(m.completionDate).toLocaleDateString()}
                                  </AppText>
                                ) : null}
                              </View>
                              <MaterialCommunityIcons
                                name={isCompleted ? "check-circle" : "checkbox-blank-circle-outline"}
                                size={22}
                                color={isCompleted ? colors.success : colors.textMuted}
                              />
                            </View>
                          </Card>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>
              );
            })}
          </View>
        ))}

        <View style={{ flexDirection: "row", gap: 10 }}>
          <AppButton title={loading ? "Loading..." : "Refresh"} variant="secondary" onPress={() => void load()} />
          <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </ScrollScreen>
  );
}
