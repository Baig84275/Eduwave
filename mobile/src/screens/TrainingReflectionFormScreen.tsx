import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { TrainingStackParamList } from "../navigation/stacks/TrainingStack";
import { useAuth } from "../auth/AuthContext";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { TextField } from "../ui/TextField";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "../ui/Text";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";

type Props = NativeStackScreenProps<TrainingStackParamList, "TrainingReflection">;

export function TrainingReflectionFormScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const { moduleId, courseId, moduleName } = route.params;

  const [reflectionText, setReflectionText] = useState("");
  const [applicationNote, setApplicationNote] = useState("");
  const [challengesFaced, setChallengesFaced] = useState("");
  const [supportNeeded, setSupportNeeded] = useState("");
  const [helpfulRating, setHelpfulRating] = useState<number | null>(null);
  const [confidenceChange, setConfidenceChange] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <ScrollScreen>
      <View style={{ gap: 16 }}>
        <ScreenHeader 
          title="Training reflection" 
          subtitle={`Module: ${moduleName}`}
        />

        <TextField
          label="What did you learn? (required)"
          value={reflectionText}
          onChangeText={(t) => setReflectionText(t.slice(0, 500))}
          placeholder="Short reflection"
          multiline
          style={{ minHeight: 120, textAlignVertical: "top" }}
        />

        <TextField
          label="How did you apply it? (required)"
          value={applicationNote}
          onChangeText={(t) => setApplicationNote(t.slice(0, 500))}
          placeholder="What you tried, or plan to try"
          multiline
          style={{ minHeight: 120, textAlignVertical: "top" }}
        />

        <TextField
          label="Challenges faced (optional)"
          value={challengesFaced}
          onChangeText={(t) => setChallengesFaced(t.slice(0, 300))}
          placeholder="What was difficult?"
          multiline
          style={{ minHeight: 90, textAlignVertical: "top" }}
        />

        <TextField
          label="Support needed (optional)"
          value={supportNeeded}
          onChangeText={(t) => setSupportNeeded(t.slice(0, 300))}
          placeholder="What would help?"
          multiline
          style={{ minHeight: 90, textAlignVertical: "top" }}
        />

        <Card>
          <AppText variant="label" weight="black">How helpful was this module?</AppText>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setHelpfulRating(n)}
                style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
              >
                <MaterialCommunityIcons
                  name={helpfulRating != null && n <= helpfulRating ? "star" : "star-outline"}
                  size={32}
                  color={helpfulRating != null && n <= helpfulRating ? "#F59E0B" : colors.textMuted}
                />
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <AppText variant="label" weight="black">Confidence change (-5 to +5)</AppText>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            {[-5, -3, -1, 0, 1, 3, 5].map((n) => {
              const selected = confidenceChange === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => setConfidenceChange(n)}
                  style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                >
                  <Card style={{ 
                    borderColor: selected ? colors.primary : colors.border, 
                    borderWidth: selected ? 2 : 1,
                    backgroundColor: selected ? colors.surface : colors.surfaceAlt,
                    width: 48,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}>
                    <AppText variant="label" weight="black" style={{ color: selected ? colors.primary : colors.text }}>
                      {n > 0 ? `+${n}` : `${n}`}
                    </AppText>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {error ? <InlineAlert tone="danger" text={error} /> : null}

        <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
                <AppButton
                  title={saving ? "Saving..." : "Submit reflection"}
                  loading={saving}
                  disabled={saving}
                  onPress={async () => {
                    if (!session) return;
                    setSaving(true);
                    setError(null);
                    try {
                      if (!reflectionText.trim() || !applicationNote.trim()) {
                        setError("Please complete the required fields");
                        setSaving(false);
                        return;
                      }
                      await api.post(
                        "/training/reflections",
                        {
                          courseId,
                          moduleId,
                          moduleName,
                          reflectionText: reflectionText.trim(),
                          applicationNote: applicationNote.trim(),
                          challengesFaced: challengesFaced.trim() ? challengesFaced.trim() : null,
                          supportNeeded: supportNeeded.trim() ? supportNeeded.trim() : null,
                          helpfulRating,
                          confidenceChange
                        },
                        session
                      );
                      navigation.navigate("TrainingReflections");
                    } catch (e: any) {
                      setError(e?.message ?? "Failed to save reflection");
                    } finally {
                      setSaving(false);
                    }
                  }}
                />
            </View>
            <View style={{ flex: 1 }}>
                <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
            </View>
        </View>
      </View>
    </ScrollScreen>
  );
}

