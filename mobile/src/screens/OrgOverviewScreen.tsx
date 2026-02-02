import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { api } from "../api/client";
import { OrgOverview } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<MainStackParamList, "OrgOverview">;

export function OrgOverviewScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const [overview, setOverview] = useState<OrgOverview | null>(null);
  const [exporting, setExporting] = useState(false);
  const now = new Date();
  const initialQuarter = Math.floor(now.getMonth() / 3) + 1;
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(initialQuarter);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ overview: OrgOverview }>("/org/overview", session);
      setOverview(res.overview);
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

  return (
    <ScrollScreen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>Organisation Overview</Text>
        <Text style={{ color: colors.textMuted }}>Anonymised totals only. No per-facilitator views or comparisons.</Text>

        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
        <Text style={{ color: colors.textMuted }}>{loading ? "Loading..." : ""}</Text>

        <Card>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Check-ins</Text>
          <Text style={{ color: colors.textMuted, marginTop: 6 }}>Total: {overview?.checkIns.total ?? 0}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 4 }}>
            Avg confidence: {overview?.checkIns.avgConfidence?.toFixed(2) ?? "—"}
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: 4 }}>
            Avg emotional load: {overview?.checkIns.avgEmotionalLoad?.toFixed(2) ?? "—"}
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: 8 }}>
            Support needed: NONE {overview?.checkIns.supportNeededCounts.NONE ?? 0} · SOME{" "}
            {overview?.checkIns.supportNeededCounts.SOME ?? 0} · URGENT {overview?.checkIns.supportNeededCounts.URGENT ?? 0}
          </Text>
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Supervision</Text>
          <Text style={{ color: colors.textMuted, marginTop: 6 }}>Total logs: {overview?.supervision.total ?? 0}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 4 }}>
            Follow-up required: {overview?.supervision.followUpRequiredTotal ?? 0}
          </Text>
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Training</Text>
          <Text style={{ color: colors.textMuted, marginTop: 6 }}>
            NOT_STARTED: {overview?.training.completionCounts.NOT_STARTED ?? 0} · IN_PROGRESS:{" "}
            {overview?.training.completionCounts.IN_PROGRESS ?? 0} · COMPLETED:{" "}
            {overview?.training.completionCounts.COMPLETED ?? 0}
          </Text>
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Quarterly PDF</Text>
          <Text style={{ color: colors.textMuted, marginTop: 6 }}>
            An anonymised organisation summary for funders and reporting.
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Pressable
              onPress={() => setYear((y) => y - 1)}
              style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
            >
              <Card style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.surfaceAlt }}>
                <Text style={{ color: colors.text, fontWeight: "900" }}>Prev year</Text>
              </Card>
            </Pressable>
            <Pressable
              onPress={() => setYear((y) => y + 1)}
              style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
            >
              <Card style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.surfaceAlt }}>
                <Text style={{ color: colors.text, fontWeight: "900" }}>Next year</Text>
              </Card>
            </Pressable>
            <Text style={{ color: colors.text, fontWeight: "900" }}>{year}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            {[1, 2, 3, 4].map((q) => {
              const selected = quarter === q;
              return (
                <Pressable
                  key={q}
                  onPress={() => setQuarter(q)}
                  style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1, flex: 1 }]}
                >
                  <Card style={{ borderColor: selected ? colors.focusRing : colors.border, borderWidth: selected ? 2 : 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "900", textAlign: "center" }}>Q{q}</Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: 12 }}>
            <AppButton
              title={exporting ? "Preparing..." : "Open quarterly PDF"}
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
        </Card>

        <AppButton title="Refresh" variant="secondary" onPress={() => void load()} />
        <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </ScrollScreen>
  );
}
