import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { AccessibilityMode, accessibilityModes, useAccessibility } from "../accessibility/AccessibilityProvider";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nProvider";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";

type Props = NativeStackScreenProps<MainStackParamList, "Accessibility">;

export function AccessibilitySettingsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config, setMode, setConfigPatch, setPreviewConfig, resetToModeDefaults } = useAccessibility();
  const { language, setLanguage, t } = useI18n();
  const colors = config.color.colors;

  const initial = useMemo(() => (session?.user.accessibilityMode ?? "STANDARD") as AccessibilityMode, [session]);
  const [selected, setSelected] = useState<AccessibilityMode>(initial);
  const [previewing, setPreviewing] = useState(false);
  const [draft, setDraft] = useState(config.granular);
  const [error, setError] = useState<string | null>(null);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);

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
            <View style={{ gap: 10, paddingTop: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>{t("settings.language")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {(
                  [
                    { code: "EN", label: t("settings.language.en") },
                    { code: "AF", label: t("settings.language.af") },
                    { code: "XH", label: t("settings.language.xh") },
                    { code: "FR", label: t("settings.language.fr") }
                  ] as const
                ).map((item) => {
                  const isSelected = language === item.code;
                  return (
                    <Pressable
                      key={item.code}
                      disabled={savingLanguage}
                      onPress={async () => {
                        setSavingLanguage(true);
                        setLanguageError(null);
                        try {
                          await setLanguage(item.code);
                        } catch (e: any) {
                          setLanguageError(e?.message ?? "Failed to save language");
                        } finally {
                          setSavingLanguage(false);
                        }
                      }}
                      style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                    >
                      <Card
                        style={{
                          borderColor: isSelected ? colors.focusRing : colors.border,
                          borderWidth: isSelected ? 2 : 1,
                          paddingVertical: 10,
                          paddingHorizontal: 12
                        }}
                      >
                        <Text style={{ fontWeight: "800", color: colors.text }}>{item.label}</Text>
                      </Card>
                    </Pressable>
                  );
                })}
              </View>
              {languageError ? <Text style={{ color: colors.danger, fontSize: 13 }}>{languageError}</Text> : null}
            </View>

            <View style={{ gap: 10, paddingTop: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Fine-tune</Text>
              <Text style={{ color: colors.textMuted, fontSize: Math.round(14 * config.typography.fontScale) }}>
                Preview changes before saving. Reset restores defaults for the selected mode.
              </Text>

              <Card>
                <Text style={{ color: colors.text, fontWeight: "900" }}>Font size</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                  {(
                    [
                      { value: "small", label: "Small" },
                      { value: "medium", label: "Medium" },
                      { value: "large", label: "Large" },
                      { value: "extra-large", label: "Extra large" }
                    ] as const
                  ).map((opt) => {
                    const isSelected = draft.fontSize === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          const next = { ...draft, fontSize: opt.value };
                          setDraft(next);
                          if (previewing) setPreviewConfig(next);
                        }}
                        style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                      >
                        <Card style={{ borderColor: isSelected ? colors.focusRing : colors.border, borderWidth: isSelected ? 2 : 1 }}>
                          <Text style={{ color: colors.text, fontWeight: "900" }}>{opt.label}</Text>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>

              <Card>
                <Text style={{ color: colors.text, fontWeight: "900" }}>Line spacing</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                  {(
                    [
                      { value: "compact", label: "Compact" },
                      { value: "normal", label: "Normal" },
                      { value: "relaxed", label: "Relaxed" },
                      { value: "extra-relaxed", label: "Extra relaxed" }
                    ] as const
                  ).map((opt) => {
                    const isSelected = draft.lineSpacing === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          const next = { ...draft, lineSpacing: opt.value };
                          setDraft(next);
                          if (previewing) setPreviewConfig(next);
                        }}
                        style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                      >
                        <Card style={{ borderColor: isSelected ? colors.focusRing : colors.border, borderWidth: isSelected ? 2 : 1 }}>
                          <Text style={{ color: colors.text, fontWeight: "900" }}>{opt.label}</Text>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>

              <Card>
                <Text style={{ color: colors.text, fontWeight: "900" }}>Icon size</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                  {(
                    [
                      { value: "default", label: "Default" },
                      { value: "large", label: "Large" },
                      { value: "extra-large", label: "Extra large" }
                    ] as const
                  ).map((opt) => {
                    const isSelected = draft.iconSize === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          const next = { ...draft, iconSize: opt.value };
                          setDraft(next);
                          if (previewing) setPreviewConfig(next);
                        }}
                        style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                      >
                        <Card style={{ borderColor: isSelected ? colors.focusRing : colors.border, borderWidth: isSelected ? 2 : 1 }}>
                          <Text style={{ color: colors.text, fontWeight: "900" }}>{opt.label}</Text>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>

              <Card>
                <Text style={{ color: colors.text, fontWeight: "900" }}>Motion</Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      title={draft.reducedMotion ? "Reduced motion: On" : "Reduced motion: Off"}
                      variant="secondary"
                      onPress={() => {
                        const next = { ...draft, reducedMotion: !draft.reducedMotion };
                        setDraft(next);
                        if (previewing) setPreviewConfig(next);
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      title={draft.highContrast ? "High contrast: On" : "High contrast: Off"}
                      variant="secondary"
                      onPress={() => {
                        const next = { ...draft, highContrast: !draft.highContrast };
                        setDraft(next);
                        if (previewing) setPreviewConfig(next);
                      }}
                    />
                  </View>
                </View>
              </Card>

              <Card>
                <Text style={{ color: colors.text, fontWeight: "900" }}>Color scheme</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                  {(
                    [
                      { value: "default", label: "Default" },
                      { value: "warm", label: "Warm" },
                      { value: "cool", label: "Cool" },
                      { value: "monochrome", label: "Monochrome" }
                    ] as const
                  ).map((opt) => {
                    const isSelected = draft.colorScheme === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          const next = { ...draft, colorScheme: opt.value };
                          setDraft(next);
                          if (previewing) setPreviewConfig(next);
                        }}
                        style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                      >
                        <Card style={{ borderColor: isSelected ? colors.focusRing : colors.border, borderWidth: isSelected ? 2 : 1 }}>
                          <Text style={{ color: colors.text, fontWeight: "900" }}>{opt.label}</Text>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>

              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <AppButton
                  title={previewing ? "Stop preview" : "Preview"}
                  variant="secondary"
                  onPress={() => {
                    const next = !previewing;
                    setPreviewing(next);
                    setPreviewConfig(next ? draft : null);
                  }}
                />
                <AppButton
                  title={`Reset to ${selected}`}
                  variant="secondary"
                  onPress={async () => {
                    setError(null);
                    try {
                      await resetToModeDefaults(selected);
                      setPreviewing(false);
                      setPreviewConfig(null);
                      setDraft(defaultsForSelected(selected));
                    } catch (e: any) {
                      setError(e?.message ?? "Failed to reset");
                    }
                  }}
                />
              </View>
            </View>
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
              title={saving ? "Saving..." : t("common.save")}
              loading={saving}
              disabled={saving}
              onPress={async () => {
                setSaving(true);
                setError(null);
                try {
                  await setMode(selected);
                  await setConfigPatch(draft);
                  setPreviewConfig(null);
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

function defaultsForSelected(mode: AccessibilityMode) {
  if (mode === "VISUAL_SUPPORT") return { fontSize: "large", lineSpacing: "normal", iconSize: "large", reducedMotion: false, highContrast: true, colorScheme: "default" } as const;
  if (mode === "HEARING_SUPPORT") return { fontSize: "medium", lineSpacing: "normal", iconSize: "default", reducedMotion: false, highContrast: false, colorScheme: "default" } as const;
  if (mode === "MOBILITY_SUPPORT") return { fontSize: "medium", lineSpacing: "normal", iconSize: "extra-large", reducedMotion: false, highContrast: false, colorScheme: "default" } as const;
  if (mode === "NEURODIVERSE") return { fontSize: "medium", lineSpacing: "relaxed", iconSize: "large", reducedMotion: true, highContrast: false, colorScheme: "warm" } as const;
  if (mode === "READING_DYSLEXIA") return { fontSize: "medium", lineSpacing: "relaxed", iconSize: "default", reducedMotion: false, highContrast: false, colorScheme: "warm" } as const;
  return { fontSize: "medium", lineSpacing: "normal", iconSize: "default", reducedMotion: false, highContrast: false, colorScheme: "default" } as const;
}
