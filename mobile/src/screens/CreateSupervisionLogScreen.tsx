import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { TextField } from "../ui/TextField";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<MainStackParamList, "CreateSupervisionLog">;

export function CreateSupervisionLogScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [facilitatorId, setFacilitatorId] = useState("");
  const [facilitatorSearch, setFacilitatorSearch] = useState("");
  const [facilitators, setFacilitators] = useState<Array<{ id: string; email: string }>>([]);
  const [loadingFacilitators, setLoadingFacilitators] = useState(false);
  const [childId, setChildId] = useState("");
  const [observationDate, setObservationDate] = useState(new Date().toISOString());
  const [strengths, setStrengths] = useState("");
  const [challenges, setChallenges] = useState("");
  const [strategies, setStrategies] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [previousLogId, setPreviousLogId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadFacilitators = useCallback(async () => {
    if (!session) return;
    setLoadingFacilitators(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ role: "FACILITATOR", ...(facilitatorSearch.trim() ? { q: facilitatorSearch.trim() } : {}) });
      const res = await api.get<{ users: Array<{ id: string; email: string; role: string }> }>(`/directory/users?${qs.toString()}`, session);
      setFacilitators(res.users.map((u) => ({ id: u.id, email: u.email })));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load facilitators");
    } finally {
      setLoadingFacilitators(false);
    }
  }, [facilitatorSearch, session]);

  useFocusEffect(
    useCallback(() => {
      void loadFacilitators();
    }, [loadFacilitators])
  );

  return (
    <ScrollScreen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>Create Supervision Log</Text>
        <Text style={{ color: colors.textMuted }}>One-way support record. Facilitator can optionally acknowledge.</Text>

        <View style={{ gap: 10 }}>
          <TextField
            label="Search facilitator"
            value={facilitatorSearch}
            onChangeText={setFacilitatorSearch}
            placeholder="Search by email"
          />
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <AppButton
              title={loadingFacilitators ? "Loading..." : "Search"}
              variant="secondary"
              onPress={() => void loadFacilitators()}
            />
            {facilitatorId ? <AppButton title="Clear selection" variant="ghost" onPress={() => setFacilitatorId("")} /> : null}
          </View>

          {facilitatorId ? (
            <Card style={{ backgroundColor: colors.surfaceAlt }}>
              <Text style={{ color: colors.textMuted }}>Selected facilitator</Text>
              <Text style={{ color: colors.text, fontWeight: "900", marginTop: 6 }}>{facilitatorId}</Text>
            </Card>
          ) : (
            <Card style={{ backgroundColor: colors.surfaceAlt }}>
              <Text style={{ color: colors.textMuted }}>Select a facilitator before creating a log</Text>
            </Card>
          )}

          {facilitators.length ? (
            <View style={{ gap: 10 }}>
              {facilitators.slice(0, 10).map((u) => {
                const selected = facilitatorId === u.id;
                return (
                  <Pressable
                    key={u.id}
                    onPress={() => setFacilitatorId(u.id)}
                    style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                  >
                    <Card style={{ borderColor: selected ? colors.focusRing : colors.border, borderWidth: selected ? 2 : 1 }}>
                      <Text style={{ color: colors.text, fontWeight: "900" }}>{u.email}</Text>
                      <Text style={{ color: colors.textMuted, marginTop: 6 }}>{u.id}</Text>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
        <TextField label="Child ID (optional)" value={childId} onChangeText={setChildId} placeholder="Optional" />
        <TextField
          label="Observation date (ISO)"
          value={observationDate}
          onChangeText={setObservationDate}
          placeholder={new Date().toISOString()}
        />
        <TextField
          label="Strengths observed"
          value={strengths}
          onChangeText={setStrengths}
          placeholder="Optional"
          multiline
          style={{ minHeight: 90, textAlignVertical: "top" }}
        />
        <TextField
          label="Challenges identified"
          value={challenges}
          onChangeText={setChallenges}
          placeholder="Optional"
          multiline
          style={{ minHeight: 90, textAlignVertical: "top" }}
        />
        <TextField
          label="Strategies recommended"
          value={strategies}
          onChangeText={setStrategies}
          placeholder="Optional"
          multiline
          style={{ minHeight: 90, textAlignVertical: "top" }}
        />

        <Pressable
          onPress={() => setFollowUpRequired((v) => !v)}
          style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
        >
          <Card
            style={{
              borderColor: followUpRequired ? colors.focusRing : colors.border,
              borderWidth: followUpRequired ? 2 : 1
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "900" }}>
              Follow-up required: {followUpRequired ? "Yes" : "No"}
            </Text>
          </Card>
        </Pressable>

        <TextField
          label="Follow-up date (ISO, optional)"
          value={followUpDate}
          onChangeText={setFollowUpDate}
          placeholder="e.g., 2026-02-10T00:00:00.000Z"
        />
        <TextField label="Previous log ID (optional)" value={previousLogId} onChangeText={setPreviousLogId} placeholder="Optional" />

        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
        {success ? <Text style={{ color: colors.primary, fontSize: 13 }}>{success}</Text> : null}

        <AppButton
          title={saving ? "Saving..." : "Create log"}
          loading={saving}
          disabled={saving}
          onPress={async () => {
            if (!session) return;
            if (!facilitatorId.trim()) {
              setError("Select a facilitator");
              return;
            }
            setSaving(true);
            setError(null);
            setSuccess(null);
            try {
              await api.post(
                "/supervision-logs",
                {
                  facilitatorId: facilitatorId.trim(),
                  childId: childId.trim() ? childId.trim() : null,
                  observationDate,
                  strengths: strengths.trim() ? strengths.trim() : null,
                  challenges: challenges.trim() ? challenges.trim() : null,
                  strategies: strategies.trim() ? strategies.trim() : null,
                  followUpRequired,
                  followUpDate: followUpDate.trim() ? followUpDate.trim() : null,
                  previousLogId: previousLogId.trim() ? previousLogId.trim() : null
                },
                session
              );
              setSuccess("Created");
              setFacilitatorId("");
              setChildId("");
              setStrengths("");
              setChallenges("");
              setStrategies("");
              setFollowUpRequired(false);
              setFollowUpDate("");
              setPreviousLogId("");
            } catch (e: any) {
              setError(e?.message ?? "Failed to create");
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
