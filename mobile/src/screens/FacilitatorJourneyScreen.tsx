import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { FacilitatorStatus, Journey } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { ScreenHeader } from "../ui/ScreenHeader";
import { AppText } from "../ui/Text";
import { InlineAlert } from "../ui/InlineAlert";
import { Badge } from "../ui/Badge";
import { Divider } from "../ui/Divider";
import { Skeleton } from "../ui/Skeleton";
import { FadeInView, SlideInView } from "../animation/AnimatedComponents";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<MainStackParamList, "Journey">;

const STATUS_CONFIG: Record<FacilitatorStatus, { label: string; color: "success" | "warning" | "neutral"; icon: string }> = {
  ACTIVE:  { label: "Active",  color: "success",  icon: "check-circle-outline" },
  PAUSED:  { label: "Paused",  color: "warning",  icon: "pause-circle-outline" },
  EXITED:  { label: "Exited",  color: "neutral",  icon: "close-circle-outline" },
};

export function FacilitatorJourneyScreen({ navigation }: Props) {
  const { session, updateUser } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [journey, setJourney] = useState<Journey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const currentStatus = (journey?.currentStatus ?? session?.user.facilitatorStatus) as FacilitatorStatus | undefined;

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
      <FadeInView>
        <View style={{ gap: 16 }}>
          <ScreenHeader
            title="My Journey"
            subtitle="Trends over time without rankings, scoring, or comparisons."
          />

          {error ? <InlineAlert tone="danger" text={error} /> : null}

          {/* Status card */}
          <SlideInView direction="up" delay={100}>
            <Card variant="elevated" elevation="md">
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <AppText variant="body" weight="bold">Current Status</AppText>
                  {currentStatus ? (
                    <Badge
                      label={STATUS_CONFIG[currentStatus]?.label ?? currentStatus}
                      color={STATUS_CONFIG[currentStatus]?.color ?? "neutral"}
                      variant="subtle"
                    />
                  ) : null}
                </View>
                <Divider />
                <AppText variant="caption" tone="muted">Update your current working status</AppText>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["ACTIVE", "PAUSED", "EXITED"] as const).map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const selected = currentStatus === s;
                    return (
                      <View key={s} style={{ flex: 1 }}>
                        <AppButton
                          title={cfg.label}
                          variant={selected ? "primary" : "secondary"}
                          size="sm"
                          disabled={savingStatus}
                          onPress={() => void setStatus(s)}
                          icon={<MaterialCommunityIcons name={cfg.icon as any} size={16} color={selected ? "#fff" : colors.textMuted} />}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            </Card>
          </SlideInView>

          {/* Stats grid */}
          <SlideInView direction="up" delay={150}>
            <AppText variant="label" weight="bold" tone="muted" style={{ marginBottom: 8 }}>ACTIVITY SUMMARY</AppText>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Card style={{ flex: 1 }} variant="solid">
                {loading ? <Skeleton width={40} height={28} variant="rounded" /> : (
                  <AppText variant="h2" weight="black">{journey?.weeksActive ?? 0}</AppText>
                )}
                <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>Weeks active</AppText>
              </Card>
              <Card style={{ flex: 1 }} variant="solid">
                {loading ? <Skeleton width={40} height={28} variant="rounded" /> : (
                  <AppText variant="h2" weight="black">{journey?.totalCheckIns ?? 0}</AppText>
                )}
                <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>Check-ins</AppText>
              </Card>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <Card style={{ flex: 1 }} variant="solid">
                {loading ? <Skeleton width={40} height={28} variant="rounded" /> : (
                  <AppText variant="h2" weight="black">{journey?.trainingCompletedCount ?? 0}</AppText>
                )}
                <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>Training done</AppText>
              </Card>
              <Card style={{ flex: 1 }} variant="solid">
                {loading ? <Skeleton width={40} height={28} variant="rounded" /> : (
                  <AppText variant="h2" weight="black">{journey?.supportSessionsCount ?? 0}</AppText>
                )}
                <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>Support sessions</AppText>
              </Card>
            </View>
          </SlideInView>

          {/* Confidence trend */}
          <SlideInView direction="up" delay={200}>
            <Card variant="elevated" elevation="sm">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <MaterialCommunityIcons name="trending-up" size={20} color={colors.success} />
                <AppText variant="body" weight="bold">Confidence Trend</AppText>
              </View>
              <AppText variant="caption" tone="muted">Weekly averages (last 8 weeks)</AppText>
              <View style={{ gap: 6, marginTop: 10 }}>
                {(journey?.confidenceTrend ?? []).slice(-8).length > 0 ? (
                  (journey?.confidenceTrend ?? []).slice(-8).map((p, i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <AppText variant="caption" tone="muted">
                        {new Date(p.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </AppText>
                      <Badge label={p.value.toFixed(1)} color="success" variant="subtle" size="sm" />
                    </View>
                  ))
                ) : (
                  <AppText variant="caption" tone="muted">{loading ? "Loading..." : "No data yet"}</AppText>
                )}
              </View>
            </Card>
          </SlideInView>

          {/* Emotional load trend */}
          <SlideInView direction="up" delay={250}>
            <Card variant="elevated" elevation="sm">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <MaterialCommunityIcons name="heart-pulse" size={20} color={colors.warning} />
                <AppText variant="body" weight="bold">Emotional Load Trend</AppText>
              </View>
              <AppText variant="caption" tone="muted">Weekly averages (last 8 weeks)</AppText>
              <View style={{ gap: 6, marginTop: 10 }}>
                {(journey?.emotionalLoadTrend ?? []).slice(-8).length > 0 ? (
                  (journey?.emotionalLoadTrend ?? []).slice(-8).map((p, i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <AppText variant="caption" tone="muted">
                        {new Date(p.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </AppText>
                      <Badge label={p.value.toFixed(1)} color="warning" variant="subtle" size="sm" />
                    </View>
                  ))
                ) : (
                  <AppText variant="caption" tone="muted">{loading ? "Loading..." : "No data yet"}</AppText>
                )}
              </View>
            </Card>
          </SlideInView>

          {/* Support flags */}
          <SlideInView direction="up" delay={300}>
            <Card variant="elevated" elevation="sm">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <MaterialCommunityIcons name="flag-outline" size={20} color={colors.danger} />
                <AppText variant="body" weight="bold">Support Flags</AppText>
              </View>
              <View style={{ gap: 6 }}>
                {(journey?.supportFlagsHistory ?? []).slice(-10).length > 0 ? (
                  (journey?.supportFlagsHistory ?? []).slice(-10).map((p, i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <AppText variant="caption" tone="muted">
                        {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </AppText>
                      <Badge
                        label={p.supportNeeded}
                        color={p.supportNeeded === "URGENT" ? "danger" : p.supportNeeded === "SOME" ? "warning" : "neutral"}
                        variant="subtle"
                        size="sm"
                      />
                    </View>
                  ))
                ) : (
                  <AppText variant="caption" tone="muted">{loading ? "Loading..." : "No flags yet"}</AppText>
                )}
              </View>
            </Card>
          </SlideInView>

          <AppButton
            title="Refresh"
            variant="secondary"
            onPress={() => void load()}
            icon={<MaterialCommunityIcons name="refresh" size={18} color={colors.textMuted} />}
          />
        </View>
      </FadeInView>
    </ScrollScreen>
  );
}
