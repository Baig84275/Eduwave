import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Linking, Text, View } from "react-native";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { HomeStackParamList } from "../navigation/stacks/HomeStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "../ui/Text";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";

type Props = NativeStackScreenProps<HomeStackParamList, "TrainerDashboard">;

type Dashboard = {
  organisationId: string;
  range: { from: string; to: string };
  checkIns: {
    total: number;
    avgConfidence: number | null;
    avgEmotionalLoad: number | null;
    supportNeededCounts: Record<"NONE" | "SOME" | "URGENT", number>;
  };
  supervision: { total: number; followUpRequiredTotal: number };
  training: { completions: number };
  trends: Array<{
    weekStart: string;
    avgConfidence: number | null;
    avgEmotionalLoad: number | null;
    supportFlags: number;
    trainingCompletions: number;
    supervisionSessions: number;
  }>;
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText variant="caption" tone="muted">{label}</AppText>
        <AppText variant="label" weight="black">{value}</AppText>
      </View>
      <View style={{ height: 10, backgroundColor: colors.surfaceAlt, borderRadius: 8, overflow: "hidden" }}>
        <View style={{ height: 10, width: `${pct * 100}%`, backgroundColor: colors.primary, borderRadius: 8 }} />
      </View>
    </View>
  );
}

export function TrainerDashboardScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Dashboard>("/trainer/dashboard", session);
      setData(res);
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

  const lastWeeks = useMemo(() => (data?.trends ?? []).slice(-8), [data]);
  const maxFlags = useMemo(() => Math.max(1, ...lastWeeks.map((w) => w.supportFlags)), [lastWeeks]);
  const maxTraining = useMemo(() => Math.max(1, ...lastWeeks.map((w) => w.trainingCompletions)), [lastWeeks]);
  const maxSupervision = useMemo(() => Math.max(1, ...lastWeeks.map((w) => w.supervisionSessions)), [lastWeeks]);

  return (
    <ScrollScreen>
      <View style={{ gap: 16 }}>
        <ScreenHeader 
          title="Trainer Dashboard" 
          subtitle="Aggregated signals only. No rankings, comparisons, or child data." 
        />

        {error ? <InlineAlert tone="danger" text={error} /> : null}

        <Card>
          <AppText variant="h3">Organisation snapshot</AppText>
          <View style={{ marginTop: 12, gap: 8 }}>
            <AppText variant="body" tone="muted">
              Check-ins: <AppText variant="body" weight="bold">{data?.checkIns.total ?? 0}</AppText>
            </AppText>
            <AppText variant="body" tone="muted">
              Training completions: <AppText variant="body" weight="bold">{data?.training.completions ?? 0}</AppText>
            </AppText>
            <AppText variant="body" tone="muted">
              Supervision sessions: <AppText variant="body" weight="bold">{data?.supervision.total ?? 0}</AppText>
            </AppText>
            
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
            
            <AppText variant="body" tone="muted">
              Avg confidence: <AppText variant="body" weight="bold">{data?.checkIns.avgConfidence == null ? "—" : round1(data.checkIns.avgConfidence)}</AppText>
            </AppText>
            <AppText variant="body" tone="muted">
              Avg emotional load: <AppText variant="body" weight="bold">{data?.checkIns.avgEmotionalLoad == null ? "—" : round1(data.checkIns.avgEmotionalLoad)}</AppText>
            </AppText>
          </View>
        </Card>

        <Card>
          <AppText variant="h3">Support flags (recent weeks)</AppText>
          <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: colors.surfaceAlt, borderRadius: 8 }}>
             <View>
                <AppText variant="caption" tone="muted">NONE</AppText>
                <AppText variant="body" weight="black">{data?.checkIns.supportNeededCounts.NONE ?? 0}</AppText>
              </View>
              <View>
                <AppText variant="caption" tone="muted">SOME</AppText>
                <AppText variant="body" weight="black">{data?.checkIns.supportNeededCounts.SOME ?? 0}</AppText>
              </View>
              <View>
                <AppText variant="caption" tone="danger">URGENT</AppText>
                <AppText variant="body" weight="black" style={{ color: colors.danger }}>{data?.checkIns.supportNeededCounts.URGENT ?? 0}</AppText>
              </View>
          </View>

          <View style={{ gap: 12, marginTop: 16 }}>
            {lastWeeks.map((w) => (
              <Bar
                key={w.weekStart}
                label={new Date(w.weekStart).toLocaleDateString()}
                value={w.supportFlags}
                max={maxFlags}
              />
            ))}
          </View>
        </Card>

        <Card>
          <AppText variant="h3">Training vs confidence</AppText>
          <AppText variant="body" tone="muted" style={{ marginTop: 8 }}>
            Training is completion count; confidence is weekly average. Use as a directional signal only.
          </AppText>
          <View style={{ gap: 24, marginTop: 16 }}>
            {lastWeeks.map((w) => (
              <View key={w.weekStart} style={{ gap: 8 }}>
                <AppText variant="label" weight="bold">{new Date(w.weekStart).toLocaleDateString()}</AppText>
                <Bar label="Training completions" value={w.trainingCompletions} max={maxTraining} />
                <Bar label="Supervision sessions" value={w.supervisionSessions} max={maxSupervision} />
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                  <AppText variant="caption" tone="muted">
                    Avg confidence: <AppText variant="caption" weight="bold">{w.avgConfidence == null ? "—" : round1(w.avgConfidence)}</AppText>
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    Avg emotional load: <AppText variant="caption" weight="bold">{w.avgEmotionalLoad == null ? "—" : round1(w.avgEmotionalLoad)}</AppText>
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppButton title={loading ? "Refreshing..." : "Refresh"} variant="secondary" onPress={() => void load()} />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton title="Assign Training" variant="secondary" onPress={() => navigation.navigate("AssignTraining")} />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
            </View>
          </View>
          <AppButton
            title="Manage Courses"
            variant="secondary"
            onPress={() => navigation.navigate("ManageCourses")}
          />
          
          <AppButton
            title={exporting ? "Preparing PDF..." : `Open Q${quarter} PDF`}
            variant="primary"
            loading={exporting}
            disabled={exporting}
            onPress={async () => {
              if (!session) return;
              setExporting(true);
              setError(null);
              try {
                const res = await api.get<{ url: string }>(`/exports/quarterly-summary-link?year=${year}&quarter=${quarter}`, session);
                await Linking.openURL(res.url);
              } catch (e: any) {
                setError(e?.message ?? "Failed to export");
              } finally {
                setExporting(false);
              }
            }}
          />
        </View>
      </View>
    </ScrollScreen>
  );
}
