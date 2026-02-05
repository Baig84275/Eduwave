import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api } from "../api/client";
import { SupervisionLog } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { TextField } from "../ui/TextField";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";
import { AppText } from "../ui/Text";

type Props = NativeStackScreenProps<MainStackParamList, "SupervisionLogs">;

export function SupervisionLogsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [logs, setLogs] = useState<SupervisionLog[]>([]);
  const [facilitatorId, setFacilitatorId] = useState("");
  const [facilitatorSearch, setFacilitatorSearch] = useState("");
  const [facilitators, setFacilitators] = useState<Array<{ id: string; email: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFacilitators, setLoadingFacilitators] = useState(false);

  const role = session?.user.role;
  const isFacilitator = role === "FACILITATOR";
  const canCreate = role === "TRAINER_SUPERVISOR" || role === "ADMIN" || role === "SUPER_ADMIN";

  const loadFacilitators = useCallback(async () => {
    if (!session || isFacilitator) return;
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
  }, [facilitatorSearch, isFacilitator, session]);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      if (isFacilitator) {
        const res = await api.get<{ logs: SupervisionLog[] }>("/supervision-logs/me", session);
        setLogs(res.logs);
      } else {
        if (!facilitatorId.trim()) {
          setLogs([]);
          setLoading(false);
          return;
        }
        const qs = new URLSearchParams({ facilitatorId: facilitatorId.trim() });
        const res = await api.get<{ logs: SupervisionLog[] }>(`/supervision-logs?${qs.toString()}`, session);
        setLogs(res.logs);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [facilitatorId, isFacilitator, session]);

  useFocusEffect(
    useCallback(() => {
      void loadFacilitators();
      void load();
    }, [load, loadFacilitators])
  );

  const acknowledge = async (logId: string) => {
    if (!session) return;
    setError(null);
    try {
      await api.post(`/supervision-logs/${logId}/acknowledge`, {}, session);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to acknowledge");
    }
  };

  return (
    <ScrollScreen>
      <View style={{ gap: 12 }}>
        <ScreenHeader title="Supervision logs" subtitle="One-way feedback. No threads, chat, or public visibility." />

        {!isFacilitator ? (
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
              {facilitatorId ? (
                <AppButton title="Clear selection" variant="ghost" onPress={() => setFacilitatorId("")} />
              ) : null}
            </View>
            {facilitatorId ? (
              <Card style={{ backgroundColor: colors.surfaceAlt }}>
                <Text style={{ color: colors.textMuted }}>Selected facilitator</Text>
                <Text style={{ color: colors.text, fontWeight: "900", marginTop: 6 }}>{facilitatorId}</Text>
              </Card>
            ) : (
              <Card style={{ backgroundColor: colors.surfaceAlt }}>
                <Text style={{ color: colors.textMuted }}>Select a facilitator to view logs</Text>
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
        ) : null}

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <AppButton title={loading ? "Loading..." : "Refresh"} variant="secondary" onPress={() => void load()} />
          {canCreate ? (
            <AppButton title="Create log" onPress={() => navigation.navigate("CreateSupervisionLog")} />
          ) : null}
        </View>

        {error ? <InlineAlert tone="danger" text={error} /> : null}

        {logs.map((log) => {
          return (
            <Card key={log.id}>
              <AppText variant="body" weight="black">
                Observation: {new Date(log.observationDate).toDateString()}
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                Follow-up required: {log.followUpRequired ? "Yes" : "No"}
                {log.followUpDate ? ` · Follow-up date: ${new Date(log.followUpDate).toLocaleDateString()}` : ""}
                {log.followUpRequired ? ` · Follow-up completed: ${log.followUpCompleted ? "Yes" : "No"}` : ""}
                {" · "}Acknowledged: {log.acknowledgedAt ? "Yes" : "No"}
              </AppText>
              {log.strengths ? (
                <AppText variant="body" style={{ marginTop: 10 }}>
                  Strengths: {log.strengths}
                </AppText>
              ) : null}
              {log.challenges ? (
                <AppText variant="body" style={{ marginTop: 10 }}>
                  Challenges: {log.challenges}
                </AppText>
              ) : null}
              {log.strategies ? (
                <AppText variant="body" style={{ marginTop: 10 }}>
                  Strategies: {log.strategies}
                </AppText>
              ) : null}

              {log.followUpCompleted ? (
                <View style={{ gap: 8, marginTop: 12 }}>
                  {log.facilitatorResponse ? (
                    <AppText variant="body">Facilitator response: {log.facilitatorResponse}</AppText>
                  ) : null}
                  {log.actionsTaken ? <AppText variant="body">Actions taken: {log.actionsTaken}</AppText> : null}
                  {log.outcomeNotes ? <AppText variant="body">Outcome: {log.outcomeNotes}</AppText> : null}
                </View>
              ) : null}

              {isFacilitator && !log.acknowledgedAt ? (
                <Pressable
                  onPress={() => void acknowledge(log.id)}
                  style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1, marginTop: 12 }]}
                >
                  <Card style={{ backgroundColor: colors.primary }}>
                    <AppText variant="label" tone="white" weight="bold">
                      Acknowledge
                    </AppText>
                  </Card>
                </Pressable>
              ) : null}

              {isFacilitator && log.followUpRequired && !log.followUpCompleted ? (
                <Pressable
                  onPress={() => navigation.navigate("SupervisionFollowUp", { logId: log.id })}
                  style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1, marginTop: 12 }]}
                >
                  <Card>
                    <Text style={{ color: colors.text, fontWeight: "900" }}>Complete follow-up</Text>
                  </Card>
                </Pressable>
              ) : null}
            </Card>
          );
        })}

        <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </ScrollScreen>
  );
}
