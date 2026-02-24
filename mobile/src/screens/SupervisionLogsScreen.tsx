import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { SupervisionLog } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ProfileStackParamList } from "../navigation/stacks/ProfileStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { TextField } from "../ui/TextField";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";
import { AppText } from "../ui/Text";
import { Badge } from "../ui/Badge";
import { Divider } from "../ui/Divider";
import { EmptyState } from "../ui/EmptyState";
import { ListItem } from "../ui/ListItem";
import { SkeletonCard } from "../ui/Skeleton";
import { Avatar } from "../ui/Avatar";
import { FadeInView, SlideInView } from "../animation/AnimatedComponents";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<ProfileStackParamList, "SupervisionLogs">;

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
        if (!facilitatorId.trim()) { setLogs([]); setLoading(false); return; }
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

  useFocusEffect(useCallback(() => { void loadFacilitators(); void load(); }, [load, loadFacilitators]));

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
      <FadeInView>
        <View style={{ gap: 16 }}>
          <ScreenHeader title="Supervision Logs" subtitle="One-way feedback. No threads, chat, or public visibility." />

          {error ? <InlineAlert tone="danger" text={error} /> : null}

          {/* Supervisor: facilitator search */}
          {!isFacilitator && (
            <SlideInView direction="up" delay={100}>
              <Card variant="elevated" elevation="md">
                <View style={{ gap: 12 }}>
                  <AppText variant="body" weight="bold">Select Facilitator</AppText>
                  <TextField
                    label="Search by email"
                    value={facilitatorSearch}
                    onChangeText={setFacilitatorSearch}
                    placeholder="Search facilitator..."
                    leftIcon={<MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />}
                  />
                  <AppButton
                    title="Search"
                    variant="secondary"
                    loading={loadingFacilitators}
                    onPress={() => void loadFacilitators()}
                  />
                  {facilitatorId ? (
                    <>
                      <Divider />
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                          <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
                          <AppText variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                            {facilitators.find((f) => f.id === facilitatorId)?.email ?? facilitatorId}
                          </AppText>
                        </View>
                        <AppButton title="Clear" variant="ghost" size="sm" onPress={() => setFacilitatorId("")} />
                      </View>
                    </>
                  ) : facilitators.length > 0 ? (
                    <>
                      <Divider />
                      <View style={{ gap: 4 }}>
                        {facilitators.slice(0, 10).map((u) => (
                          <ListItem
                            key={u.id}
                            title={u.email}
                            subtitle={u.id}
                            selected={facilitatorId === u.id}
                            onPress={() => { setFacilitatorId(u.id); void load(); }}
                            leftContent={<Avatar name={u.email} size="sm" />}
                            showChevron={false}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}
                </View>
              </Card>
            </SlideInView>
          )}

          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <AppButton
              title="Refresh"
              variant="secondary"
              loading={loading}
              icon={<MaterialCommunityIcons name="refresh" size={18} color={colors.textMuted} />}
              onPress={() => void load()}
            />
            {canCreate && (
              <AppButton
                title="Create Log"
                icon={<MaterialCommunityIcons name="plus" size={18} color="#fff" />}
                onPress={() => navigation.navigate("CreateSupervisionLog")}
              />
            )}
          </View>

          <Divider label="LOGS" />

          {loading ? (
            <View style={{ gap: 12 }}>{[1, 2].map((i) => <SkeletonCard key={i} />)}</View>
          ) : logs.length === 0 ? (
            <EmptyState
              title={isFacilitator ? "No supervision logs yet" : "Select a facilitator to view logs"}
              message={isFacilitator ? "Logs will appear here when your supervisor records an observation." : undefined}
            />
          ) : (
            <View style={{ gap: 12 }}>
              {logs.map((log, index) => (
                <SlideInView key={log.id} direction="up" delay={index * 60}>
                  <Card variant="elevated" elevation="md">
                    <View style={{ gap: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <AppText variant="body" weight="bold">{new Date(log.observationDate).toDateString()}</AppText>
                          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>Supervision observation</AppText>
                        </View>
                        <View style={{ gap: 4, alignItems: "flex-end" }}>
                          {log.acknowledgedAt ? (
                            <Badge label="Acknowledged" color="success" variant="subtle" size="sm" />
                          ) : (
                            <Badge label="Unread" color="info" variant="subtle" size="sm" />
                          )}
                          {log.followUpRequired && (
                            <Badge
                              label={log.followUpCompleted ? "Follow-up done" : "Follow-up needed"}
                              color={log.followUpCompleted ? "success" : "warning"}
                              variant="subtle"
                              size="sm"
                            />
                          )}
                        </View>
                      </View>
                      <Divider />
                      {log.strengths ? (
                        <View style={{ gap: 4 }}>
                          <AppText variant="label" weight="bold" tone="muted">STRENGTHS</AppText>
                          <AppText variant="body">{log.strengths}</AppText>
                        </View>
                      ) : null}
                      {log.challenges ? (
                        <View style={{ gap: 4 }}>
                          <AppText variant="label" weight="bold" tone="muted">CHALLENGES</AppText>
                          <AppText variant="body">{log.challenges}</AppText>
                        </View>
                      ) : null}
                      {log.strategies ? (
                        <View style={{ gap: 4 }}>
                          <AppText variant="label" weight="bold" tone="muted">STRATEGIES</AppText>
                          <AppText variant="body">{log.strategies}</AppText>
                        </View>
                      ) : null}
                      {log.followUpCompleted && (
                        <>
                          <Divider label="FOLLOW-UP OUTCOME" />
                          {log.facilitatorResponse ? <View style={{ gap: 4 }}><AppText variant="label" weight="bold" tone="muted">RESPONSE</AppText><AppText variant="body">{log.facilitatorResponse}</AppText></View> : null}
                          {log.actionsTaken ? <View style={{ gap: 4 }}><AppText variant="label" weight="bold" tone="muted">ACTIONS TAKEN</AppText><AppText variant="body">{log.actionsTaken}</AppText></View> : null}
                          {log.outcomeNotes ? <View style={{ gap: 4 }}><AppText variant="label" weight="bold" tone="muted">OUTCOME</AppText><AppText variant="body">{log.outcomeNotes}</AppText></View> : null}
                        </>
                      )}
                      {isFacilitator && !log.acknowledgedAt ? (
                        <AppButton title="Acknowledge" variant="secondary" size="sm" onPress={() => void acknowledge(log.id)} />
                      ) : null}
                      {isFacilitator && log.followUpRequired && !log.followUpCompleted ? (
                        <AppButton
                          title="Complete follow-up"
                          size="sm"
                          icon={<MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />}
                          onPress={() => navigation.navigate("SupervisionFollowUp", { logId: log.id })}
                        />
                      ) : null}
                    </View>
                  </Card>
                </SlideInView>
              ))}
            </View>
          )}
        </View>
      </FadeInView>
    </ScrollScreen>
  );
}
