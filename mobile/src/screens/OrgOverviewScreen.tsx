import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { api } from "../api/client";
import { OrgOverview } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "../ui/Text";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";

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
      <View style={{ gap: 16 }}>
        <ScreenHeader 
          title="Organisation Overview" 
          subtitle="Anonymised totals only. No per-facilitator views or comparisons." 
        />

        {error ? <InlineAlert tone="danger" text={error} /> : null}
        
        {loading ? (
          <AppText variant="caption" tone="muted">Loading data...</AppText>
        ) : null}

        <Card>
          <AppText variant="h3">Check-ins</AppText>
          <View style={{ marginTop: 12, gap: 8 }}>
            <AppText variant="body" tone="muted">Total: <AppText variant="body" weight="bold">{overview?.checkIns.total ?? 0}</AppText></AppText>
            <AppText variant="body" tone="muted">
              Avg confidence: <AppText variant="body" weight="bold">{overview?.checkIns.avgConfidence?.toFixed(2) ?? "—"}</AppText>
            </AppText>
            <AppText variant="body" tone="muted">
              Avg emotional load: <AppText variant="body" weight="bold">{overview?.checkIns.avgEmotionalLoad?.toFixed(2) ?? "—"}</AppText>
            </AppText>
            
            <View style={{ marginTop: 8, padding: 12, backgroundColor: colors.surfaceAlt, borderRadius: 8 }}>
              <AppText variant="label" weight="bold" style={{ marginBottom: 8 }}>Support Needed</AppText>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <AppText variant="caption" tone="muted">NONE</AppText>
                  <AppText variant="body" weight="black">{overview?.checkIns.supportNeededCounts.NONE ?? 0}</AppText>
                </View>
                <View>
                  <AppText variant="caption" tone="muted">SOME</AppText>
                  <AppText variant="body" weight="black">{overview?.checkIns.supportNeededCounts.SOME ?? 0}</AppText>
                </View>
                <View>
                  <AppText variant="caption" tone="danger">URGENT</AppText>
                  <AppText variant="body" weight="black" style={{ color: colors.danger }}>{overview?.checkIns.supportNeededCounts.URGENT ?? 0}</AppText>
                </View>
              </View>
            </View>
          </View>
        </Card>

        <Card>
          <AppText variant="h3">Supervision</AppText>
          <View style={{ marginTop: 12, gap: 8 }}>
            <AppText variant="body" tone="muted">Total logs: <AppText variant="body" weight="bold">{overview?.supervision.total ?? 0}</AppText></AppText>
            <AppText variant="body" tone="muted">
              Follow-up required: <AppText variant="body" weight="bold">{overview?.supervision.followUpRequiredTotal ?? 0}</AppText>
            </AppText>
          </View>
        </Card>

        <Card>
          <AppText variant="h3">Training</AppText>
          <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: colors.surfaceAlt, borderRadius: 8 }}>
             <View>
                <AppText variant="caption" tone="muted">NOT STARTED</AppText>
                <AppText variant="body" weight="black">{overview?.training.completionCounts.NOT_STARTED ?? 0}</AppText>
              </View>
              <View>
                <AppText variant="caption" tone="muted">IN PROGRESS</AppText>
                <AppText variant="body" weight="black">{overview?.training.completionCounts.IN_PROGRESS ?? 0}</AppText>
              </View>
              <View>
                <AppText variant="caption" tone="success">COMPLETED</AppText>
                <AppText variant="body" weight="black" style={{ color: colors.success }}>{overview?.training.completionCounts.COMPLETED ?? 0}</AppText>
              </View>
          </View>
        </Card>

        <Card>
          <AppText variant="h3">Quarterly PDF</AppText>
          <AppText variant="body" tone="muted" style={{ marginTop: 8 }}>
            An anonymised organisation summary for funders and reporting.
          </AppText>
          
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: 'space-between', marginTop: 16, marginBottom: 12 }}>
            <AppButton 
              title="Prev" 
              variant="secondary" 
              size="sm"
              onPress={() => setYear((y) => y - 1)} 
            />
            <AppText variant="h2">{year}</AppText>
            <AppButton 
              title="Next" 
              variant="secondary" 
              size="sm"
              onPress={() => setYear((y) => y + 1)} 
            />
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {[1, 2, 3, 4].map((q) => {
              const selected = quarter === q;
              return (
                <Pressable
                  key={q}
                  onPress={() => setQuarter(q)}
                  style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1, flex: 1 }]}
                >
                  <Card style={{ 
                    borderColor: selected ? colors.primary : colors.border, 
                    borderWidth: selected ? 2 : 1,
                    backgroundColor: selected ? colors.surface : colors.surfaceAlt,
                    paddingVertical: 12,
                    alignItems: 'center'
                  }}>
                    <AppText variant="label" weight="black" style={{ color: selected ? colors.primary : colors.text }}>Q{q}</AppText>
                  </Card>
                </Pressable>
              );
            })}
          </View>
          
          <View style={{ marginTop: 16 }}>
            <AppButton
              title={exporting ? "Preparing PDF..." : "Open quarterly PDF"}
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

        <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
                <AppButton title="Refresh" variant="secondary" onPress={() => void load()} />
            </View>
            <View style={{ flex: 1 }}>
                <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
            </View>
        </View>
      </View>
    </ScrollScreen>
  );
}
