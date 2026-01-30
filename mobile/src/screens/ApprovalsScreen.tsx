import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { api } from "../api/client";
import { ProgressUpdate } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";

type Props = NativeStackScreenProps<MainStackParamList, "Approvals">;

export function ApprovalsScreen({ route }: Props) {
  const { childId } = route.params;
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const res = await api.get<{ updates: ProgressUpdate[] }>(`/progress/${childId}`, session);
    setUpdates(res.updates.filter((u) => u.status === "PENDING_PARENT_APPROVAL"));
  }, [childId, session]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setError(null);
          await load();
        } catch (e: any) {
          if (!cancelled) setError(e?.message ?? "Failed to load");
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text, letterSpacing: config.typography.letterSpacing }}>
        Approvals
      </Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: -6 }}>Review and decide on updates</Text>

      {session?.user.role !== "PARENT" ? (
        <Card>
          <Text style={{ color: colors.text, fontWeight: "700" }}>Only parents can approve updates.</Text>
          <Text style={{ color: colors.textMuted, marginTop: 6 }}>Switch to a parent account to continue.</Text>
        </Card>
      ) : null}
      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
        data={updates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          return (
            <Card>
              <Text style={{ fontWeight: "800", color: colors.text }}>{item.type}</Text>
              {item.milestoneTitle ? <Text style={{ marginTop: 8, color: colors.text }}>Milestone: {item.milestoneTitle}</Text> : null}
              {item.note ? <Text style={{ marginTop: 8, color: colors.text }}>Note: {item.note}</Text> : null}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <AppButton
                    title="Approve"
                    variant="success"
                    onPress={async () => {
                      if (!session) return;
                      try {
                        await api.post(`/progress/update/${item.id}/decision`, { decision: "approve" }, session);
                        await load();
                      } catch (e: any) {
                        setError(e?.message ?? "Failed");
                      }
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton
                    title="Reject"
                    variant="danger"
                    onPress={async () => {
                      if (!session) return;
                      try {
                        await api.post(`/progress/update/${item.id}/decision`, { decision: "reject" }, session);
                        await load();
                      } catch (e: any) {
                        setError(e?.message ?? "Failed");
                      }
                    }}
                  />
                </View>
              </View>
              <Text style={{ color: colors.textMuted, marginTop: 10 }}>{new Date(item.createdAt).toLocaleString()}</Text>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
