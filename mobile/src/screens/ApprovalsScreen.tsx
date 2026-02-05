import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { FlatList, View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { api } from "../api/client";
import { ProgressUpdate } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { AppText } from "../ui/Text";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";

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
      <ScreenHeader title="Approvals" subtitle="Review and decide on updates" />

      {session?.user.role !== "PARENT" ? (
        <Card>
          <AppText variant="label" weight="black">Only parents can approve updates.</AppText>
          <AppText variant="body" tone="muted" style={{ marginTop: 8 }}>Switch to a parent account to continue.</AppText>
        </Card>
      ) : null}

      {error ? <InlineAlert tone="danger" text={error} /> : null}

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 12, gap: 12 }}
        data={updates}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Card style={{ backgroundColor: colors.surfaceAlt }}>
            <AppText variant="label" weight="black">No pending approvals</AppText>
            <AppText variant="body" tone="muted" style={{ marginTop: 8 }}>
              When a facilitator submits an update, it will appear here for review.
            </AppText>
          </Card>
        }
        renderItem={({ item }) => {
          return (
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <AppText variant="label" weight="black">{item.type}</AppText>
                <AppText variant="caption" tone="muted">{new Date(item.createdAt).toLocaleDateString()}</AppText>
              </View>
              
              {item.milestoneTitle ? (
                 <AppText variant="body" style={{ marginTop: 8 }}>Milestone: <AppText weight="bold">{item.milestoneTitle}</AppText></AppText>
              ) : null}
              
              {item.note ? (
                 <AppText variant="body" tone="muted" style={{ marginTop: 8 }}>Note: {item.note}</AppText>
              ) : null}

              <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
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
            </Card>
          );
        }}
      />
    </Screen>
  );
}
