import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { FlatList, View } from "react-native";
import { api } from "../api/client";
import { Child, ProgressUpdate } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";
import { AppText } from "../ui/Text";
import { EmptyState } from "../ui/EmptyState";

type Props = NativeStackScreenProps<MainStackParamList, "Child">;

export function ChildDetailScreen({ route, navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const { childId } = route.params;
  const [child, setChild] = useState<Child | null>(null);
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "SUPER_ADMIN";

  const load = useCallback(async () => {
    if (!session) return;
    setError(null);
    const c = await api.get<{ child: Child }>(`/children/${childId}`, session);
    const u = await api.get<{ updates: ProgressUpdate[] }>(`/progress/${childId}`, session);
    setChild(c.child);
    setUpdates(u.updates);
  }, [childId, session]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
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
      <Card>
        <ScreenHeader
          title={child?.name ?? "Child"}
          subtitle={child?.healthStatus ? `Health: ${child.healthStatus}` : "Health: Not provided"}
        />
      </Card>

      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <View style={{ minWidth: 150, flexGrow: 1 }}>
          <AppButton title="Add update" onPress={() => navigation.navigate("AddUpdate", { childId })} />
        </View>
        <View style={{ minWidth: 150, flexGrow: 1 }}>
          <AppButton
            title="Upload media"
            variant="secondary"
            onPress={() => navigation.navigate("UploadMedia", { childId })}
          />
        </View>
        {isAdmin ? (
          <View style={{ minWidth: 150, flexGrow: 1 }}>
            <AppButton
              title="Assign facilitator"
              variant="secondary"
              onPress={() => navigation.navigate("AssignFacilitator", { childId })}
            />
          </View>
        ) : null}
        {session?.user.role === "PARENT" ? (
          <View style={{ minWidth: 150, flexGrow: 1 }}>
            <AppButton title="Approvals" variant="secondary" onPress={() => navigation.navigate("Approvals", { childId })} />
          </View>
        ) : null}
        <View style={{ minWidth: 150, flexGrow: 1 }}>
          <AppButton title="Refresh" variant="ghost" onPress={() => load().catch(() => {})} />
        </View>
      </View>

      {error ? <InlineAlert tone="danger" text={error} /> : null}

      <AppText variant="body" weight="black">
        Timeline
      </AppText>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 4, gap: 12 }}
        data={updates}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState title="No updates yet" message="Add an update or upload media to start building evidence over time." />
        }
        renderItem={({ item }) => {
          return (
            <Card>
              <AppText variant="label" weight="black">
                {item.type} · {item.status}
              </AppText>
              {item.milestoneTitle ? (
                <AppText variant="body" style={{ marginTop: 8 }}>
                  Milestone: {item.milestoneTitle}
                </AppText>
              ) : null}
              {item.note ? (
                <AppText variant="body" style={{ marginTop: 8 }}>
                  Note: {item.note}
                </AppText>
              ) : null}
              {item.media?.length ? (
                <AppText variant="caption" tone="muted" style={{ marginTop: 8 }}>
                  Media: {item.media.length}
                </AppText>
              ) : null}
              <AppText variant="caption" tone="muted" style={{ marginTop: 10 }}>
                {new Date(item.createdAt).toLocaleString()}
              </AppText>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
