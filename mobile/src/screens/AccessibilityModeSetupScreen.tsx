import React, { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { AccessibilityMode, accessibilityModes, useAccessibility } from "../accessibility/AccessibilityProvider";
import { useAuth } from "../auth/AuthContext";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";

export function AccessibilityModeSetupScreen() {
  const { session } = useAuth();
  const { config, setMode } = useAccessibility();
  const colors = config.color.colors;

  const initial = useMemo(() => (session?.user.accessibilityMode ?? null) as AccessibilityMode | null, [session]);
  const [selected, setSelected] = useState<AccessibilityMode | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <Screen>
      <FlatList
        data={accessibilityModes}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 6 }}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <Text
              style={{
                fontSize: 30,
                fontWeight: "900",
                color: colors.text,
                letterSpacing: config.typography.letterSpacing
              }}
            >
              Choose your experience
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: Math.round(15 * config.typography.fontScale) }}>
              This setting shapes layout, text, motion, and interaction across the app.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selected === item.id;
          return (
            <Pressable
              onPress={() => setSelected(item.id)}
              style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
            >
              <Card
                style={{
                  borderColor: isSelected ? colors.focusRing : colors.border,
                  borderWidth: isSelected ? 2 : 1
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>{item.title}</Text>
                <Text style={{ marginTop: 6, color: colors.textMuted }}>{item.subtitle}</Text>
              </Card>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={{ gap: 10, paddingTop: 4 }}>
            {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
            <AppButton
              title={saving ? "Saving..." : "Continue"}
              loading={saving}
              disabled={saving}
              onPress={async () => {
                if (!selected) {
                  setError("Please select one mode to continue.");
                  return;
                }
                setSaving(true);
                setError(null);
                try {
                  await setMode(selected);
                } catch (e: any) {
                  setError(e?.message ?? "Failed to save");
                } finally {
                  setSaving(false);
                }
              }}
            />
          </View>
        }
      />
    </Screen>
  );
}
