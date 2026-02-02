import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api } from "../api/client";
import { CheckInFrequency, SettingContext, SupportNeeded } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { TextField } from "../ui/TextField";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<MainStackParamList, "CheckIn">;

function RatingRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.text, fontWeight: "900" }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
            >
              <Card style={{ borderColor: selected ? colors.focusRing : colors.border, borderWidth: selected ? 2 : 1 }}>
                <Text style={{ color: colors.text, fontWeight: "900" }}>{n}</Text>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function CheckInScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [frequency, setFrequency] = useState<CheckInFrequency>("DAILY");
  const [confidence, setConfidence] = useState(3);
  const [emotionalLoad, setEmotionalLoad] = useState(3);
  const [supportNeeded, setSupportNeeded] = useState<SupportNeeded>("NONE");
  const [settingContext, setSettingContext] = useState<SettingContext | null>(null);
  const [specificEvent, setSpecificEvent] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <ScrollScreen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>Facilitator Check-In</Text>
        <Text style={{ color: colors.textMuted }}>Quick check-in under 2 minutes. Submissions cannot be edited.</Text>

        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Frequency</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {(
              [
                { value: "DAILY", label: "Daily" },
                { value: "WEEKLY", label: "Weekly" }
              ] as const
            ).map((f) => {
              const selected = frequency === f.value;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => setFrequency(f.value)}
                  style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                >
                  <Card style={{ borderColor: selected ? colors.focusRing : colors.border, borderWidth: selected ? 2 : 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "900" }}>{f.label}</Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </View>

        <RatingRow label="Confidence (1–5)" value={confidence} onChange={setConfidence} />
        <RatingRow label="Emotional load (1–5)" value={emotionalLoad} onChange={setEmotionalLoad} />

        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Support needed</Text>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            {(
              [
                { value: "NONE", label: "None" },
                { value: "SOME", label: "Some" },
                { value: "URGENT", label: "Urgent" }
              ] as const
            ).map((s) => {
              const selected = supportNeeded === s.value;
              return (
                <Pressable
                  key={s.value}
                  onPress={() => setSupportNeeded(s.value)}
                  style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                >
                  <Card style={{ borderColor: selected ? colors.focusRing : colors.border, borderWidth: selected ? 2 : 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "900" }}>{s.label}</Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Where were you working?</Text>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            {(
              [
                { value: null, label: "Skip" },
                { value: "HOME", label: "Home" },
                { value: "SCHOOL", label: "School" },
                { value: "MIXED", label: "Mixed" },
                { value: "OTHER", label: "Other" }
              ] as const
            ).map((opt) => {
              const selected = settingContext === opt.value;
              return (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => setSettingContext(opt.value)}
                  style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                >
                  <Card style={{ borderColor: selected ? colors.focusRing : colors.border, borderWidth: selected ? 2 : 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "900" }}>{opt.label}</Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField
          label="What prompted this check-in? (optional)"
          value={specificEvent}
          onChangeText={(t) => setSpecificEvent(t.slice(0, 200))}
          placeholder="e.g., Challenging behavior, positive breakthrough"
        />

        <TextField
          label="Optional note"
          value={note}
          onChangeText={setNote}
          placeholder="Short note (optional)"
          multiline
          style={{ minHeight: 110, textAlignVertical: "top" }}
        />

        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
        {success ? <Text style={{ color: colors.primary, fontSize: 13 }}>{success}</Text> : null}

        <AppButton
          title={saving ? "Submitting..." : "Submit check-in"}
          loading={saving}
          disabled={saving}
          onPress={async () => {
            if (!session) return;
            setSaving(true);
            setError(null);
            setSuccess(null);
            try {
              await api.post(
                "/check-ins",
                {
                  frequency,
                  confidence,
                  emotionalLoad,
                  supportNeeded,
                  settingContext,
                  specificEvent: specificEvent.trim() ? specificEvent.trim() : null,
                  note: note.trim() ? note.trim() : null
                },
                session
              );
              setSuccess("Submitted. Thank you.");
              setSpecificEvent("");
              setNote("");
            } catch (e: any) {
              setError(e?.message ?? "Failed to submit");
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
