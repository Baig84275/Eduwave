import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Screen } from "../ui/Screen";
import { TextField } from "../ui/TextField";

type Props = NativeStackScreenProps<MainStackParamList, "AddUpdate">;

export function AddUpdateScreen({ route, navigation }: Props) {
  const { childId } = route.params;
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const [type, setType] = useState<"MILESTONE" | "NOTE">("MILESTONE");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text, letterSpacing: config.typography.letterSpacing }}>
        Add update
      </Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: -6 }}>Share progress for this child</Text>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <AppButton title="Milestone" variant={type === "MILESTONE" ? "primary" : "secondary"} onPress={() => setType("MILESTONE")} />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton title="Note" variant={type === "NOTE" ? "primary" : "secondary"} onPress={() => setType("NOTE")} />
        </View>
      </View>

      {type === "MILESTONE" ? (
        <TextField label="Milestone title" value={milestoneTitle} onChangeText={setMilestoneTitle} placeholder="What was achieved?" />
      ) : null}

      <TextField
        label="Note"
        value={note}
        onChangeText={setNote}
        multiline
        placeholder="Add details (optional)"
        style={{ minHeight: 110, textAlignVertical: "top" }}
      />

      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}

      <AppButton
        title={loading ? "Saving..." : "Save update"}
        loading={loading}
        disabled={loading}
        onPress={async () => {
          if (!session) return;
          setLoading(true);
          setError(null);
          try {
            await api.post(
              `/progress/${childId}`,
              {
                type,
                milestoneTitle: type === "MILESTONE" ? milestoneTitle.trim() : undefined,
                note: note.trim() || undefined
              },
              session
            );
            navigation.goBack();
          } catch (e: any) {
            setError(e?.message ?? "Failed to save");
          } finally {
            setLoading(false);
          }
        }}
      />
    </Screen>
  );
}
