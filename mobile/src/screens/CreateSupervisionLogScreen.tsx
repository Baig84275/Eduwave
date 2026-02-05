import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { TextField } from "../ui/TextField";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "../ui/Text";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";

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
      <View style={{ gap: 16 }}>
        <ScreenHeader 
          title="Create Supervision Log" 
          subtitle="One-way support record. Facilitator can optionally acknowledge." 
        />

        <View style={{ gap: 12 }}>
          <AppText variant="h3">Facilitator</AppText>
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
              <AppText variant="caption" tone="muted">Selected facilitator</AppText>
              <AppText variant="body" weight="black" style={{ marginTop: 4 }}>{facilitatorId}</AppText>
            </Card>
          ) : (
            <Card style={{ backgroundColor: colors.surfaceAlt }}>
              <AppText variant="body" tone="muted">Select a facilitator before creating a log</AppText>
            </Card>
          )}

          {facilitators.length ? (
            <View style={{ gap: 8 }}>
              {facilitators.slice(0, 5).map((u) => {
                const selected = facilitatorId === u.id;
                return (
                  <Pressable
                    key={u.id}
                    onPress={() => setFacilitatorId(u.id)}
                    style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                  >
                    <Card style={{ 
                      borderColor: selected ? colors.primary : colors.border, 
                      borderWidth: selected ? 2 : 1,
                      backgroundColor: selected ? colors.surface : colors.surfaceAlt
                    }}>
                      <AppText variant="label" weight="black" style={{ color: selected ? colors.primary : colors.text }}>{u.email}</AppText>
                      <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>{u.id}</AppText>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={{ gap: 12 }}>
            <AppText variant="h3">Details</AppText>
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
                  borderColor: followUpRequired ? colors.primary : colors.border,
                  borderWidth: followUpRequired ? 2 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <View>
                    <AppText variant="label" weight="black" style={{ color: followUpRequired ? colors.primary : colors.text }}>
                      Follow-up required
                    </AppText>
                    <AppText variant="caption" tone="muted">Flag for supervisor attention</AppText>
                </View>
                <MaterialCommunityIcons 
                   name={followUpRequired ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                   size={24} 
                   color={followUpRequired ? colors.primary : colors.textMuted} 
                />
              </Card>
            </Pressable>
    
            <TextField
              label="Follow-up date (ISO, optional)"
              value={followUpDate}
              onChangeText={setFollowUpDate}
              placeholder="e.g., 2026-02-10T00:00:00.000Z"
            />
            <TextField label="Previous log ID (optional)" value={previousLogId} onChangeText={setPreviousLogId} placeholder="Optional" />
        </View>

        {error ? <InlineAlert tone="danger" text={error} /> : null}
        {success ? <InlineAlert tone="success" text={success} /> : null}

        <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
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
            </View>
            <View style={{ flex: 1 }}>
                <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
            </View>
        </View>
      </View>
    </ScrollScreen>
  );
}
