import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { api } from "../api/client";
import { SupervisionLog } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { TextField } from "../ui/TextField";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<MainStackParamList, "SupervisionFollowUp">;

export function SupervisionFollowUpScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const { logId } = route.params;

  const [facilitatorResponse, setFacilitatorResponse] = useState("");
  const [actionsTaken, setActionsTaken] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <ScrollScreen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>Follow-up</Text>
        <Text style={{ color: colors.textMuted }}>Capture what you tried and what happened.</Text>

        <Card style={{ backgroundColor: colors.surfaceAlt }}>
          <Text style={{ color: colors.textMuted }}>Log ID: {logId}</Text>
        </Card>

        <TextField
          label="Your response (optional)"
          value={facilitatorResponse}
          onChangeText={(t) => setFacilitatorResponse(t.slice(0, 2000))}
          placeholder="Your reflection on the feedback"
          multiline
          style={{ minHeight: 110, textAlignVertical: "top" }}
        />

        <TextField
          label="Actions taken (optional)"
          value={actionsTaken}
          onChangeText={(t) => setActionsTaken(t.slice(0, 2000))}
          placeholder="What you tried"
          multiline
          style={{ minHeight: 110, textAlignVertical: "top" }}
        />

        <TextField
          label="Outcome notes (optional)"
          value={outcomeNotes}
          onChangeText={(t) => setOutcomeNotes(t.slice(0, 2000))}
          placeholder="Did it work? What changed?"
          multiline
          style={{ minHeight: 110, textAlignVertical: "top" }}
        />

        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}

        <AppButton
          title={saving ? "Saving..." : "Mark follow-up completed"}
          loading={saving}
          disabled={saving}
          onPress={async () => {
            if (!session) return;
            setSaving(true);
            setError(null);
            try {
              await api.patch<{ log: SupervisionLog }>(
                `/supervision-logs/${encodeURIComponent(logId)}/follow-up`,
                {
                  facilitatorResponse: facilitatorResponse.trim() ? facilitatorResponse.trim() : null,
                  actionsTaken: actionsTaken.trim() ? actionsTaken.trim() : null,
                  outcomeNotes: outcomeNotes.trim() ? outcomeNotes.trim() : null,
                  followUpCompleted: true
                },
                session
              );
              navigation.goBack();
            } catch (e: any) {
              setError(e?.message ?? "Failed to save follow-up");
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

