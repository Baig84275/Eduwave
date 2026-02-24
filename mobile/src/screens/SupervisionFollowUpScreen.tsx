import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { SupervisionLog } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { ScreenHeader } from "../ui/ScreenHeader";
import { AppText } from "../ui/Text";
import { TextField } from "../ui/TextField";
import { InlineAlert } from "../ui/InlineAlert";
import { FadeInView } from "../animation/AnimatedComponents";
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
      <FadeInView>
        <View style={{ gap: 16 }}>
          <ScreenHeader
            title="Complete Follow-up"
            subtitle="Capture what you tried and what happened."
          />

          <Card variant="solid" style={{ backgroundColor: colors.surfaceAlt }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialCommunityIcons name="information-outline" size={18} color={colors.textMuted} />
              <AppText variant="caption" tone="muted">Supervision log reference</AppText>
            </View>
            <AppText variant="label" weight="bold" style={{ marginTop: 6 }}>{logId}</AppText>
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

          {error ? <InlineAlert tone="danger" text={error} /> : null}

          <AppButton
            title="Mark follow-up completed"
            loading={saving}
            disabled={saving}
            icon={<MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" />}
            onPress={async () => {
              if (!session) return;
              setSaving(true);
              setError(null);
              try {
                await api.patch<{ log: SupervisionLog }>(
                  `/supervision-logs/${encodeURIComponent(logId)}/follow-up`,
                  {
                    facilitatorResponse: facilitatorResponse.trim() || null,
                    actionsTaken: actionsTaken.trim() || null,
                    outcomeNotes: outcomeNotes.trim() || null,
                    followUpCompleted: true,
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
      </FadeInView>
    </ScrollScreen>
  );
}
