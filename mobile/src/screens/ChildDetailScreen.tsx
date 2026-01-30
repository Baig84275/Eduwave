import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { api } from "../api/client";
import { Child, ProgressUpdate } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";

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
        <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text, letterSpacing: config.typography.letterSpacing }}>
          {child?.name ?? "Child"}
        </Text>
        {child?.healthStatus ? (
          <Text style={{ marginTop: 6, color: colors.textMuted }}>Health: {child.healthStatus}</Text>
        ) : (
          <Text style={{ marginTop: 6, color: colors.textMuted }}>Health: Not provided</Text>
        )}
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

      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}

      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>Timeline</Text>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
        data={updates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          return (
            <Card>
              <Text style={{ fontWeight: "800", color: colors.text }}>
                {item.type} · {item.status}
              </Text>
              {item.milestoneTitle ? <Text style={{ marginTop: 8, color: colors.text }}>Milestone: {item.milestoneTitle}</Text> : null}
              {item.note ? <Text style={{ marginTop: 8, color: colors.text }}>Note: {item.note}</Text> : null}
              {item.media?.length ? <Text style={{ marginTop: 8, color: colors.textMuted }}>Media: {item.media.length}</Text> : null}
              <Text style={{ marginTop: 10, color: colors.textMuted }}>{new Date(item.createdAt).toLocaleString()}</Text>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
