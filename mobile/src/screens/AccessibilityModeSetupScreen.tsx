import React, { useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AccessibilityMode, accessibilityModes, useAccessibility } from "../accessibility/AccessibilityProvider";
import { useAuth } from "../auth/AuthContext";
import { AppButton } from "../ui/Button";
import { Screen } from "../ui/Screen";
import { AppText } from "../ui/Text";
import { tokens } from "../theme/tokens";
import { FadeInView, StaggeredItem } from "../animation/AnimatedComponents";

const MODE_ICONS: Record<AccessibilityMode, string> = {
  STANDARD:          "monitor",
  VISUAL_SUPPORT:    "eye-outline",
  READING_DYSLEXIA:  "book-open-outline",
  HEARING_SUPPORT:   "ear-hearing",
  MOBILITY_SUPPORT:  "hand-extended-outline",
  NEURODIVERSE:      "brain",
};

const MODE_DESCRIPTIONS: Record<AccessibilityMode, string> = {
  STANDARD:         "The default app experience.",
  VISUAL_SUPPORT:   "High contrast colours and larger text for better visibility.",
  READING_DYSLEXIA: "Increased letter spacing and warm background to ease reading.",
  HEARING_SUPPORT:  "Visual-first alerts and clear on-screen cues.",
  MOBILITY_SUPPORT: "Larger touch targets and a simplified navigation layout.",
  NEURODIVERSE:     "Calm colours, reduced motion, and a less cluttered interface.",
};

export function AccessibilityModeSetupScreen() {
  const { session } = useAuth();
  const { config, setMode } = useAccessibility();
  const colors = config.color.colors;

  const initial = useMemo(
    () => (session?.user.accessibilityMode ?? null) as AccessibilityMode | null,
    [session]
  );
  const [selected, setSelected] = useState<AccessibilityMode | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <Screen>
      <FlatList
        data={accessibilityModes}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ gap: tokens.spacing.sm, paddingBottom: tokens.spacing.xl }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <FadeInView>
            {/* Hero card */}
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: tokens.radius.xl,
                padding: tokens.spacing.xl,
                marginBottom: tokens.spacing.lg,
                gap: tokens.spacing.md,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: tokens.radius.lg,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons name="tune-variant" size={28} color="#fff" />
              </View>
              <AppText variant="h2" weight="black" style={{ color: "#fff" }}>
                Choose your experience
              </AppText>
              <AppText variant="body" style={{ color: "rgba(255,255,255,0.88)" }}>
                Select the mode that best fits your needs. It shapes typography, motion, colours, and interaction
                across the entire app.{"\n"}You can change this anytime in Settings.
              </AppText>
            </LinearGradient>
          </FadeInView>
        }
        renderItem={({ item, index }) => {
          const isSelected = selected === item.id;
          return (
            <StaggeredItem index={index} staggerDelay={50}>
              <Pressable
                onPress={() => setSelected(item.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${item.title}. ${MODE_DESCRIPTIONS[item.id]}`}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: tokens.spacing.md,
                    padding: tokens.spacing.md,
                    borderRadius: tokens.radius.lg,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.surface : colors.surfaceAlt,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {/* Mode icon */}
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: tokens.radius.md,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isSelected ? colors.primaryLight : colors.surfaceElevated,
                  }}
                >
                  <MaterialCommunityIcons
                    name={MODE_ICONS[item.id] as any}
                    size={24}
                    color={isSelected ? colors.primaryDark : colors.textMuted}
                  />
                </View>

                {/* Text */}
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText
                    variant="body"
                    weight="bold"
                    style={{ color: isSelected ? colors.primary : colors.text }}
                  >
                    {item.title}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {MODE_DESCRIPTIONS[item.id]}
                  </AppText>
                </View>

                {/* Selection indicator */}
                {isSelected && (
                  <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />
                )}
              </Pressable>
            </StaggeredItem>
          );
        }}
        ListFooterComponent={
          <View style={{ gap: tokens.spacing.sm, paddingTop: tokens.spacing.md }}>
            {error ? (
              <AppText variant="caption" tone="danger">
                {error}
              </AppText>
            ) : null}
            <AppButton
              title={saving ? "Setting up…" : "Continue"}
              loading={saving}
              disabled={saving || !selected}
              icon={<MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />}
              iconPosition="right"
              onPress={async () => {
                if (!selected) {
                  setError("Please select a mode to continue.");
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
