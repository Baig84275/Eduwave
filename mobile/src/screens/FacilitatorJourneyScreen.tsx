import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api } from "../api/client";
import { FacilitatorStatus, Journey } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<MainStackParamList, "Journey">;

export function FacilitatorJourneyScreen({ navigation }: Props) {
  const { session, updateUser } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const [journey, setJourney] = useState<Journey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ journey: Journey }>("/check-ins/journey/me", session);
      setJourney(res.journey);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const setStatus = async (facilitatorStatus: FacilitatorStatus) => {
    if (!session) return;
    setSavingStatus(true);
    setError(null);
    try {
      const res = await api.patch<{ user: { facilitatorStatus: FacilitatorStatus } }>(
        "/users/me/facilitator-status",
        { facilitatorStatus },
        session
      );
      await updateUser({ facilitatorStatus: res.user.facilitatorStatus });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <ScrollScreen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>My Journey</Text>
        <Text style={{ color: colors.textMuted }}>Trends over time without rankings, scoring, or comparisons.</Text>

        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}

        <Card>
          <Text style={{ color: colors.text, fontWeight: "900" }}>
            Current status: {journey?.currentStatus ?? session?.user.facilitatorStatus ?? "—"}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {(
              [
                { value: "ACTIVE", label: "Active" },
                { value: "PAUSED", label: "Paused" },
                { value: "EXITED", label: "Exited" }
              ] as const
            ).map((s) => {
              const selected = (journey?.currentStatus ?? session?.user.facilitatorStatus) === s.value;
              return (
                <Pressable
                  key={s.value}
                  disabled={savingStatus}
                  onPress={() => void setStatus(s.value)}
                  style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                >
                  <Card
                    style={{
                      borderColor: selected ? colors.focusRing : colors.border,
                      borderWidth: selected ? 2 : 1,
                      paddingVertical: 10,
                      paddingHorizontal: 12
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: "900" }}>{s.label}</Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted }}>Weeks active</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 6 }}>
              {journey?.weeksActive ?? (loading ? "…" : "0")}
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted }}>Total check-ins</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 6 }}>
              {journey?.totalCheckIns ?? (loading ? "…" : "0")}
            </Text>
          </Card>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted }}>Training completed</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 6 }}>
              {journey?.trainingCompletedCount ?? (loading ? "…" : "0")}
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted }}>Support sessions</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 6 }}>
              {journey?.supportSessionsCount ?? (loading ? "…" : "0")}
            </Text>
          </Card>
        </View>

        <Card>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Confidence trend (weekly average)</Text>
          <Text style={{ color: colors.textMuted, marginTop: 6 }}>
            {(journey?.confidenceTrend ?? [])
              .slice(-8)
              .map((p) => `${new Date(p.weekStart).toLocaleDateString()}: ${p.value.toFixed(1)}`)
              .join(" · ") || "No data yet"}
          </Text>
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Emotional load trend (weekly average)</Text>
          <Text style={{ color: colors.textMuted, marginTop: 6 }}>
            {(journey?.emotionalLoadTrend ?? [])
              .slice(-8)
              .map((p) => `${new Date(p.weekStart).toLocaleDateString()}: ${p.value.toFixed(1)}`)
              .join(" · ") || "No data yet"}
          </Text>
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Support flags history</Text>
          <Text style={{ color: colors.textMuted, marginTop: 6 }}>
            {(journey?.supportFlagsHistory ?? [])
              .slice(-10)
              .map((p) => `${new Date(p.createdAt).toLocaleDateString()}: ${p.supportNeeded}`)
              .join(" · ") || "No flags yet"}
          </Text>
        </Card>

        <AppButton title="Refresh" variant="secondary" onPress={() => void load()} />
        <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </ScrollScreen>
  );
}
