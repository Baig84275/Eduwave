import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { AccessibilityMode, accessibilityModes, useAccessibility } from "../accessibility/AccessibilityProvider";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";

type Props = NativeStackScreenProps<MainStackParamList, "Accessibility">;

export function AccessibilitySettingsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config, setMode } = useAccessibility();
  const colors = config.color.colors;

  const initial = useMemo(() => (session?.user.accessibilityMode ?? "STANDARD") as AccessibilityMode, [session]);
  const [selected, setSelected] = useState<AccessibilityMode>(initial);
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
                fontSize: 24,
                fontWeight: "900",
                color: colors.text,
                letterSpacing: config.typography.letterSpacing
              }}
            >
              Accessibility Mode
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: Math.round(14 * config.typography.fontScale) }}>
              Update how the app behaves across typography, motion, and interaction.
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
              title={saving ? "Saving..." : "Save changes"}
              loading={saving}
              disabled={saving}
              onPress={async () => {
                setSaving(true);
                setError(null);
                try {
                  await setMode(selected);
                  navigation.goBack();
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
