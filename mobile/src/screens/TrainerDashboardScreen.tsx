import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Linking, Text, View } from "react-native";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<MainStackParamList, "TrainerDashboard">;

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
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 13 }}>{value}</Text>
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
      <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>Trainer Dashboard</Text>
      <Text style={{ color: colors.textMuted }}>
        Aggregated signals only. No rankings, comparisons, or child data.
      </Text>

      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}

      <Card>
        <Text style={{ color: colors.text, fontWeight: "900" }}>Organisation snapshot</Text>
        <Text style={{ color: colors.textMuted, marginTop: 6 }}>
          Check-ins: {data?.checkIns.total ?? 0} · Training completions: {data?.training.completions ?? 0} · Supervision sessions:{" "}
          {data?.supervision.total ?? 0}
        </Text>
        <Text style={{ color: colors.textMuted, marginTop: 6 }}>
          Avg confidence: {data?.checkIns.avgConfidence == null ? "—" : round1(data.checkIns.avgConfidence)} · Avg emotional load:{" "}
          {data?.checkIns.avgEmotionalLoad == null ? "—" : round1(data.checkIns.avgEmotionalLoad)}
        </Text>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: "900" }}>Support flags (recent weeks)</Text>
        <Text style={{ color: colors.textMuted, marginTop: 6 }}>
          NONE {data?.checkIns.supportNeededCounts.NONE ?? 0} · SOME {data?.checkIns.supportNeededCounts.SOME ?? 0} · URGENT{" "}
          {data?.checkIns.supportNeededCounts.URGENT ?? 0}
        </Text>
        <View style={{ gap: 10, marginTop: 10 }}>
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
        <Text style={{ color: colors.text, fontWeight: "900" }}>Training vs confidence (recent weeks)</Text>
        <Text style={{ color: colors.textMuted, marginTop: 6 }}>
          Training is completion count; confidence is weekly average. Use as a directional signal only.
        </Text>
        <View style={{ gap: 12, marginTop: 10 }}>
          {lastWeeks.map((w) => (
            <View key={w.weekStart} style={{ gap: 8 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{new Date(w.weekStart).toLocaleDateString()}</Text>
              <Bar label="Training completions" value={w.trainingCompletions} max={maxTraining} />
              <Bar label="Supervision sessions" value={w.supervisionSessions} max={maxSupervision} />
              <Text style={{ color: colors.text, fontWeight: "900" }}>
                Avg confidence: {w.avgConfidence == null ? "—" : round1(w.avgConfidence)}
              </Text>
              <Text style={{ color: colors.textMuted }}>
                Avg emotional load: {w.avgEmotionalLoad == null ? "—" : round1(w.avgEmotionalLoad)}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <AppButton title={loading ? "Refreshing..." : "Refresh"} variant="secondary" onPress={() => void load()} />
        <AppButton
          title={exporting ? "Preparing PDF..." : `Open Q${quarter} PDF`}
          variant="secondary"
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
        <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </ScrollScreen>
  );
}
