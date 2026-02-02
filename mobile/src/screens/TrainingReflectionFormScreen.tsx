import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { MainStackParamList } from "../navigation/MainStack";
import { useAuth } from "../auth/AuthContext";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { TextField } from "../ui/TextField";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<MainStackParamList, "TrainingReflection">;

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
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>Training reflection</Text>
        <Text style={{ color: colors.textMuted }}>
          Module: {moduleName} · {courseId}
        </Text>

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
          <Text style={{ color: colors.text, fontWeight: "900" }}>How helpful was this module?</Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setHelpfulRating(n)}
                style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
              >
                <MaterialCommunityIcons
                  name={helpfulRating != null && n <= helpfulRating ? "star" : "star-outline"}
                  size={28}
                  color={helpfulRating != null && n <= helpfulRating ? "#F59E0B" : colors.textMuted}
                />
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Confidence change (-5 to +5)</Text>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            {[-5, -3, -1, 0, 1, 3, 5].map((n) => {
              const selected = confidenceChange === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => setConfidenceChange(n)}
                  style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                >
                  <Card style={{ borderColor: selected ? colors.focusRing : colors.border, borderWidth: selected ? 2 : 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "900" }}>{n > 0 ? `+${n}` : `${n}`}</Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}

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

        <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </ScrollScreen>
  );
}

