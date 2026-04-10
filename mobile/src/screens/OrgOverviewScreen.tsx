import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Linking, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { OrgOverview } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { HomeStackParamList } from "../navigation/stacks/HomeStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { ScreenHeader } from "../ui/ScreenHeader";
import { AppText } from "../ui/Text";
import { InlineAlert } from "../ui/InlineAlert";
import { Badge } from "../ui/Badge";
import { Divider } from "../ui/Divider";
import { SkeletonCard } from "../ui/Skeleton";
import { FadeInView, SlideInView } from "../animation/AnimatedComponents";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<HomeStackParamList, "OrgOverview">;

export function OrgOverviewScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [overview, setOverview] = useState<OrgOverview | null>(null);
  const [exporting, setExporting] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
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

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <ScrollScreen>
      <FadeInView>
        <View style={{ gap: 16 }}>
          <ScreenHeader title="Organisation Overview" subtitle="Anonymised totals only. No per-facilitator views or comparisons." />

          {error ? <InlineAlert tone="danger" text={error} /> : null}

          {loading ? (
            <View style={{ gap: 12 }}>{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</View>
          ) : (
            <>
              {/* Check-ins card */}
              <SlideInView direction="up" delay={100}>
                <Card variant="elevated" elevation="md">
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <MaterialCommunityIcons name="clipboard-check-outline" size={20} color={colors.primary} />
                    <AppText variant="body" weight="bold">Check-ins</AppText>
                    <Badge label={String(overview?.checkIns.total ?? 0)} color="primary" variant="subtle" size="sm" />
                  </View>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <AppText variant="body" tone="muted">Avg confidence</AppText>
                      <AppText variant="body" weight="bold">{overview?.checkIns.avgConfidence?.toFixed(2) ?? "—"}</AppText>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <AppText variant="body" tone="muted">Avg emotional load</AppText>
                      <AppText variant="body" weight="bold">{overview?.checkIns.avgEmotionalLoad?.toFixed(2) ?? "—"}</AppText>
                    </View>
                  </View>
                  <Divider label="SUPPORT NEEDED" style={{ marginVertical: 12 }} />
                  <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                    <View style={{ alignItems: "center", gap: 6 }}>
                      <AppText variant="h2" weight="black">{overview?.checkIns.supportNeededCounts.NONE ?? 0}</AppText>
                      <Badge label="NONE" color="success" variant="subtle" size="sm" />
                    </View>
                    <View style={{ alignItems: "center", gap: 6 }}>
                      <AppText variant="h2" weight="black">{overview?.checkIns.supportNeededCounts.SOME ?? 0}</AppText>
                      <Badge label="SOME" color="warning" variant="subtle" size="sm" />
                    </View>
                    <View style={{ alignItems: "center", gap: 6 }}>
                      <AppText variant="h2" weight="black" style={{ color: colors.danger }}>
                        {overview?.checkIns.supportNeededCounts.URGENT ?? 0}
                      </AppText>
                      <Badge label="URGENT" color="danger" variant="subtle" size="sm" />
                    </View>
                  </View>
                </Card>
              </SlideInView>

              {/* Supervision card */}
              <SlideInView direction="up" delay={150}>
                <Card variant="elevated" elevation="md">
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <MaterialCommunityIcons name="account-supervisor-outline" size={20} color={colors.info} />
                    <AppText variant="body" weight="bold">Supervision</AppText>
                    <Badge label={String(overview?.supervision.total ?? 0)} color="info" variant="subtle" size="sm" />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <AppText variant="body" tone="muted">Follow-up required</AppText>
                    <AppText variant="body" weight="bold">{overview?.supervision.followUpRequiredTotal ?? 0}</AppText>
                  </View>
                </Card>
              </SlideInView>

              {/* Training card */}
              <SlideInView direction="up" delay={200}>
                <Card variant="elevated" elevation="md">
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <MaterialCommunityIcons name="school-outline" size={20} color={colors.success} />
                    <AppText variant="body" weight="bold">Training</AppText>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                    <View style={{ alignItems: "center", gap: 6 }}>
                      <AppText variant="h2" weight="black">{overview?.training.completionCounts.NOT_STARTED ?? 0}</AppText>
                      <Badge label="NOT STARTED" color="neutral" variant="subtle" size="sm" />
                    </View>
                    <View style={{ alignItems: "center", gap: 6 }}>
                      <AppText variant="h2" weight="black">{overview?.training.completionCounts.IN_PROGRESS ?? 0}</AppText>
                      <Badge label="IN PROGRESS" color="info" variant="subtle" size="sm" />
                    </View>
                    <View style={{ alignItems: "center", gap: 6 }}>
                      <AppText variant="h2" weight="black" style={{ color: colors.success }}>
                        {overview?.training.completionCounts.COMPLETED ?? 0}
                      </AppText>
                      <Badge label="COMPLETED" color="success" variant="subtle" size="sm" />
                    </View>
                  </View>
                </Card>
              </SlideInView>

              {/* Quarterly PDF */}
              <SlideInView direction="up" delay={250}>
                <Card variant="elevated" elevation="md">
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <MaterialCommunityIcons name="file-pdf-box" size={20} color={colors.danger} />
                    <AppText variant="body" weight="bold">Quarterly PDF</AppText>
                  </View>
                  <AppText variant="caption" tone="muted" style={{ marginBottom: 16 }}>
                    Anonymised organisation summary for funders and reporting.
                  </AppText>

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <AppButton title="‹" variant="secondary" size="sm" onPress={() => setYear((y) => y - 1)} />
                    <AppText variant="h2" weight="black">{year}</AppText>
                    <AppButton title="›" variant="secondary" size="sm" onPress={() => setYear((y) => y + 1)} />
                  </View>

                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                    {[1, 2, 3, 4].map((q) => {
                      const selected = quarter === q;
                      return (
                        <Card
                          key={q}
                          pressable
                          onPress={() => setQuarter(q)}
                          style={{
                            flex: 1,
                            borderColor: selected ? colors.primary : colors.border,
                            borderWidth: selected ? 2 : 1,
                            backgroundColor: selected ? colors.surface : colors.surfaceAlt,
                            alignItems: "center",
                            paddingVertical: 12,
                          }}
                        >
                          <AppText variant="label" weight="black" style={{ color: selected ? colors.primary : colors.text }}>
                            Q{q}
                          </AppText>
                        </Card>
                      );
                    })}
                  </View>

                  <AppButton
                    title="Open quarterly PDF"
                    loading={exporting}
                    disabled={exporting}
                    icon={<MaterialCommunityIcons name="open-in-new" size={18} color="#fff" />}
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
                </Card>
              </SlideInView>
            </>
          )}

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AppButton
                title="Refresh"
                variant="secondary"
                loading={loading}
                icon={<MaterialCommunityIcons name="refresh" size={18} color={colors.textMuted} />}
                onPress={() => void load()}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
            </View>
          </View>
        </View>
      </FadeInView>
    </ScrollScreen>
  );
}
