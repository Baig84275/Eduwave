import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { api } from "../api/client";
import { TrainingCompletionStatus, TrainingModuleItem } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";
import { AppText } from "../ui/Text";

type Props = NativeStackScreenProps<MainStackParamList, "TrainingHub">;

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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

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
          moduleName: item.module.moduleName
        });
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to update");
    }
  };

  return (
    <ScrollScreen>
      <View style={{ gap: 12 }}>
        <ScreenHeader
          title="Training"
          subtitle="Links-only training tracking. No hosting, quizzes, assessments, or certificates."
        />

        {error ? <InlineAlert tone="danger" text={error} /> : null}
        <AppText variant="caption" tone="muted">
          {loading ? "Loading..." : `${modules.length} assigned modules`}
        </AppText>

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <AppButton title="My reflections" variant="secondary" onPress={() => navigation.navigate("TrainingReflections")} />
          <AppButton title="Refresh" variant="secondary" onPress={() => void load()} />
        </View>

        {modules.map((item) => {
          return (
            <Card key={item.module.id}>
              <AppText variant="body" weight="black">
                {item.module.moduleName}
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                Course: {item.module.courseId} · Status: {item.status}
              </AppText>
              {item.completedAt ? (
                <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                  Completed: {new Date(item.completedAt).toLocaleDateString()}
                </AppText>
              ) : null}
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                <Pressable
                  onPress={() => void Linking.openURL(item.module.lmsUrl)}
                  style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                >
                  <Card style={{ backgroundColor: colors.primary }}>
                    <AppText variant="label" tone="white" weight="bold">
                      Open
                    </AppText>
                  </Card>
                </Pressable>

                {item.status !== "IN_PROGRESS" ? (
                  <Pressable
                    onPress={() => void setStatus(item, "IN_PROGRESS")}
                    style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                  >
                    <Card>
                      <AppText variant="label" weight="black">
                        Mark in progress
                      </AppText>
                    </Card>
                  </Pressable>
                ) : null}

                {item.status !== "COMPLETED" ? (
                  <Pressable
                    onPress={() => void setStatus(item, "COMPLETED")}
                    style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                  >
                    <Card>
                      <AppText variant="label" weight="black">
                        Mark completed
                      </AppText>
                    </Card>
                  </Pressable>
                ) : null}
              </View>
            </Card>
          );
        })}
        <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </ScrollScreen>
  );
}
