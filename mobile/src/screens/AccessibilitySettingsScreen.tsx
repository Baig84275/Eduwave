import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AccessibilityMode, accessibilityModes, useAccessibility } from "../accessibility/AccessibilityProvider";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nProvider";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { AppText } from "../ui/Text";
import { InlineAlert } from "../ui/InlineAlert";
import { Divider } from "../ui/Divider";
import { FadeInView, StaggeredItem } from "../animation/AnimatedComponents";
import { tokens } from "../theme/tokens";
import { useToast } from "../ui/ToastProvider";

type Props = NativeStackScreenProps<MainStackParamList, "Accessibility">;

const LANG_OPTIONS = [
  { code: "EN" as const, label: "English", flag: "🇬🇧" },
  { code: "AF" as const, label: "Afrikaans", flag: "🇿🇦" },
  { code: "XH" as const, label: "isiXhosa", flag: "🇿🇦" },
  { code: "FR" as const, label: "Français", flag: "🇫🇷" },
];

const MODE_ICONS: Record<AccessibilityMode, string> = {
  STANDARD: "monitor",
  VISUAL_SUPPORT: "eye-outline",
  READING_DYSLEXIA: "book-open-outline",
  HEARING_SUPPORT: "ear-hearing",
  MOBILITY_SUPPORT: "hand-extended-outline",
  NEURODIVERSE: "brain",
};

// Color swatches for each scheme option
const SCHEME_SWATCHES: Record<string, { dot: string; bg: string }> = {
  default: { dot: "#0E7490", bg: "#F8FAFC" },
  warm:    { dot: "#B45309", bg: "#FBF7ED" },
  cool:    { dot: "#2563EB", bg: "#EFF6FF" },
  monochrome: { dot: "#475569", bg: "#F1F5F9" },
};

function defaultsForMode(mode: AccessibilityMode): ReturnType<typeof defaultsForMode> {
  if (mode === "VISUAL_SUPPORT")
    return { fontSize: "large",  lineSpacing: "normal",  iconSize: "large",       reducedMotion: false, highContrast: true,  colorScheme: "default" } as const;
  if (mode === "HEARING_SUPPORT")
    return { fontSize: "medium", lineSpacing: "normal",  iconSize: "default",     reducedMotion: false, highContrast: false, colorScheme: "default" } as const;
  if (mode === "MOBILITY_SUPPORT")
    return { fontSize: "medium", lineSpacing: "normal",  iconSize: "extra-large", reducedMotion: false, highContrast: false, colorScheme: "default" } as const;
  if (mode === "NEURODIVERSE")
    return { fontSize: "medium", lineSpacing: "relaxed", iconSize: "large",       reducedMotion: true,  highContrast: false, colorScheme: "warm"    } as const;
  if (mode === "READING_DYSLEXIA")
    return { fontSize: "medium", lineSpacing: "relaxed", iconSize: "default",     reducedMotion: false, highContrast: false, colorScheme: "warm"    } as const;
  return   { fontSize: "medium", lineSpacing: "normal",  iconSize: "default",     reducedMotion: false, highContrast: false, colorScheme: "default" } as const;
}

export function AccessibilitySettingsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config, setMode, setConfigPatch, setPreviewConfig, resetToModeDefaults } = useAccessibility();
  const { language, setLanguage, t } = useI18n();
  const toast = useToast();
  const colors = config.color.colors;

  const savedMode = useMemo(() => (session?.user.accessibilityMode ?? "STANDARD") as AccessibilityMode, [session]);
  const [selected, setSelected] = useState<AccessibilityMode>(savedMode);
  const [draft, setDraft] = useState(config.granular);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Detect unsaved changes
  const hasChanges = useMemo(() => {
    if (selected !== savedMode) return true;
    const g = config.granular;
    return (
      draft.fontSize      !== g.fontSize      ||
      draft.lineSpacing   !== g.lineSpacing   ||
      draft.iconSize      !== g.iconSize      ||
      draft.colorScheme   !== g.colorScheme   ||
      draft.reducedMotion !== g.reducedMotion ||
      draft.highContrast  !== g.highContrast
    );
  }, [selected, savedMode, draft, config.granular]);

  // Apply live preview whenever draft changes
  const updateDraft = useCallback(
    (patch: Partial<typeof draft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        setPreviewConfig(next);
        return next;
      });
    },
    [setPreviewConfig]
  );

  // When the user taps a mode card, auto-load that mode's defaults + preview
  const handleModeSelect = useCallback(
    (mode: AccessibilityMode) => {
      setSelected(mode);
      const defaults = defaultsForMode(mode);
      setDraft(defaults);
      setPreviewConfig(defaults);
    },
    [setPreviewConfig]
  );

  // Clean up preview when navigating away without saving
  useEffect(() => {
    return () => {
      setPreviewConfig(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedModeInfo = accessibilityModes.find((m) => m.id === selected);

  // ── Sub-components ──────────────────────────────────────────

  const SectionLabel = ({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) => (
    <View style={[styles.sectionLabel, { marginTop: tokens.spacing.xl }]}>
      <View style={[styles.sectionIcon, { backgroundColor: colors.primaryLight }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" weight="bold">{title}</AppText>
        {subtitle ? <AppText variant="caption" tone="muted">{subtitle}</AppText> : null}
      </View>
    </View>
  );

  const ChipGroup = ({
    label,
    options,
    value,
    onSelect,
  }: {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onSelect: (v: string) => void;
  }) => (
    <View style={styles.chipGroup}>
      <AppText style={styles.chipGroupLabel}>{label}</AppText>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: active ? 2 : 1,
                  backgroundColor: active ? colors.primary : colors.surface,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                variant="label"
                weight={active ? "bold" : "medium"}
                style={{ color: active ? colors.textInverse : colors.text }}
              >
                {opt.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const SwitchRow = ({
    label,
    description,
    value,
    onToggle,
  }: {
    label: string;
    description: string;
    value: boolean;
    onToggle: (v: boolean) => void;
  }) => (
    <View style={[styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" weight="medium">{label}</AppText>
        <AppText variant="caption" tone="muted">{description}</AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.textInverse}
      />
    </View>
  );

  // ── Render ───────────────────────────────────────────────────

  return (
    <Screen>
      {/* Gradient header */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <AppText variant="h2" weight="black" style={{ color: "#fff", marginBottom: tokens.spacing.xs }}>
          Accessibility & Language
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <MaterialCommunityIcons name={MODE_ICONS[selected] as any} size={14} color="rgba(255,255,255,0.85)" />
          <AppText variant="caption" style={{ color: "rgba(255,255,255,0.85)" }}>
            {selectedModeInfo?.title ?? selected}
            {hasChanges ? "  ·  Unsaved changes" : ""}
          </AppText>
        </View>
      </LinearGradient>

      <FadeInView>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── LANGUAGE ── */}
          <SectionLabel icon="translate" title="Language" subtitle="App display language" />

          <View style={styles.chipRow}>
            {LANG_OPTIONS.map((item) => {
              const active = language === item.code;
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.langChip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      borderWidth: active ? 2 : 1,
                      backgroundColor: active ? colors.primary : colors.surface,
                      opacity: pressed ? 0.8 : savingLanguage ? 0.5 : 1,
                    },
                  ]}
                >
                  <AppText style={{ fontSize: 18 }}>{item.flag}</AppText>
                  <AppText
                    variant="label"
                    weight={active ? "bold" : "medium"}
                    style={{ color: active ? colors.textInverse : colors.text }}
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          {languageError ? (
            <View style={{ marginTop: tokens.spacing.sm }}>
              <InlineAlert tone="danger" text={languageError} />
            </View>
          ) : null}

          {/* ── ACCESSIBILITY MODE ── */}
          <SectionLabel
            icon="tune-variant"
            title="Accessibility Mode"
            subtitle="Tap a mode — settings preview instantly"
          />

          <View style={{ gap: tokens.spacing.sm }}>
            {accessibilityModes.map((item, index) => {
              const isSelected = selected === item.id;
              const isSaved = savedMode === item.id && !isSelected;
              return (
                <StaggeredItem key={item.id} index={index} staggerDelay={40}>
                  <Pressable
                    onPress={() => handleModeSelect(item.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.modeCard,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                        backgroundColor: isSelected ? colors.surface : colors.surfaceAlt,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    {/* Icon */}
                    <View
                      style={[
                        styles.modeIcon,
                        { backgroundColor: isSelected ? colors.primaryLight : colors.surfaceElevated },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={MODE_ICONS[item.id] as any}
                        size={22}
                        color={isSelected ? colors.primaryDark : colors.textMuted}
                      />
                    </View>

                    {/* Text */}
                    <View style={{ flex: 1 }}>
                      <AppText
                        variant="body"
                        weight="bold"
                        style={{ color: isSelected ? colors.primary : colors.text }}
                      >
                        {item.title}
                      </AppText>
                      <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                        {item.subtitle}
                      </AppText>
                    </View>

                    {/* Badge / checkmark */}
                    <View style={{ alignItems: "flex-end", minWidth: 24 }}>
                      {isSelected ? (
                        <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />
                      ) : isSaved ? (
                        <View
                          style={[
                            styles.savedBadge,
                            { backgroundColor: colors.successLight, borderColor: colors.success },
                          ]}
                        >
                          <AppText style={{ color: colors.success, fontSize: 10, fontWeight: "700" }}>SAVED</AppText>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                </StaggeredItem>
              );
            })}
          </View>

          {/* ── FINE-TUNE ── */}
          <SectionLabel
            icon="sliders-horizontal"
            title="Fine-tune Settings"
            subtitle="Adjust beyond your mode's defaults"
          />

          {/* Text & Reading */}
          <Card variant="elevated" elevation="sm" style={{ marginBottom: tokens.spacing.md }}>
            <AppText style={styles.subSectionLabel}>TEXT & READING</AppText>
            <ChipGroup
              label="Font Size"
              options={[
                { value: "small",       label: "Small"  },
                { value: "medium",      label: "Medium" },
                { value: "large",       label: "Large"  },
                { value: "extra-large", label: "XL"     },
              ]}
              value={draft.fontSize}
              onSelect={(v) => updateDraft({ fontSize: v as any })}
            />
            <ChipGroup
              label="Line Spacing"
              options={[
                { value: "compact",       label: "Compact"  },
                { value: "normal",        label: "Normal"   },
                { value: "relaxed",       label: "Relaxed"  },
                { value: "extra-relaxed", label: "Wide"     },
              ]}
              value={draft.lineSpacing}
              onSelect={(v) => updateDraft({ lineSpacing: v as any })}
            />
          </Card>

          {/* Display */}
          <Card variant="elevated" elevation="sm" style={{ marginBottom: tokens.spacing.md }}>
            <AppText style={styles.subSectionLabel}>DISPLAY</AppText>
            <ChipGroup
              label="Icon Size"
              options={[
                { value: "default",     label: "Default" },
                { value: "large",       label: "Large"   },
                { value: "extra-large", label: "XL"      },
              ]}
              value={draft.iconSize}
              onSelect={(v) => updateDraft({ iconSize: v as any })}
            />

            {/* Color scheme — with visual swatches */}
            <View style={styles.chipGroup}>
              <AppText style={styles.chipGroupLabel}>Color Scheme</AppText>
              <View style={styles.chipRow}>
                {(["default", "warm", "cool", "monochrome"] as const).map((scheme) => {
                  const active = draft.colorScheme === scheme;
                  const swatch = SCHEME_SWATCHES[scheme];
                  return (
                    <Pressable
                      key={scheme}
                      onPress={() => updateDraft({ colorScheme: scheme })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={({ pressed }) => [
                        styles.schemeChip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          borderWidth: active ? 2 : 1,
                          backgroundColor: active ? colors.primaryLight : colors.surface,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      {/* Swatch dot */}
                      <View style={[styles.swatchOuter, { backgroundColor: swatch.bg, borderColor: colors.border }]}>
                        <View style={[styles.swatchInner, { backgroundColor: swatch.dot }]} />
                      </View>
                      <AppText
                        variant="caption"
                        weight={active ? "bold" : "medium"}
                        style={{
                          color: active ? colors.primaryDark : colors.textMuted,
                          textTransform: "capitalize",
                          textAlign: "center",
                        }}
                      >
                        {scheme}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>

          {/* Motion & Contrast */}
          <Card variant="elevated" elevation="sm" style={{ gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
            <AppText style={styles.subSectionLabel}>MOTION & CONTRAST</AppText>
            <SwitchRow
              label="Reduce Motion"
              description="Minimise animations and transitions"
              value={draft.reducedMotion}
              onToggle={(v) => updateDraft({ reducedMotion: v })}
            />
            <Divider />
            <SwitchRow
              label="High Contrast"
              description="Stronger colour contrast for readability"
              value={draft.highContrast}
              onToggle={(v) => updateDraft({ highContrast: v })}
            />
          </Card>

          {/* Unsaved changes notice */}
          {hasChanges ? (
            <View style={{ marginBottom: tokens.spacing.md }}>
              <InlineAlert tone="info" text="You have unsaved changes. Tap Save to apply them." />
            </View>
          ) : null}

          {/* Error */}
          {error ? (
            <View style={{ marginBottom: tokens.spacing.md }}>
              <InlineAlert tone="danger" text={error} />
            </View>
          ) : null}

          {/* Actions */}
          <View style={{ gap: tokens.spacing.sm, paddingBottom: tokens.spacing.xl }}>
            <AppButton
              title={saving ? "Saving…" : "Save Changes"}
              loading={saving}
              disabled={saving || !hasChanges}
              icon={<MaterialCommunityIcons name="content-save-outline" size={18} color="#fff" />}
              onPress={async () => {
                setSaving(true);
                setError(null);
                try {
                  await setMode(selected);
                  await setConfigPatch(draft);
                  setPreviewConfig(null);
                  toast.success("Settings saved", "Your accessibility preferences have been updated.");
                  navigation.goBack();
                } catch (e: any) {
                  setError(e?.message ?? "Failed to save");
                } finally {
                  setSaving(false);
                }
              }}
            />
            <AppButton
              title={resetting ? "Resetting…" : `Reset to ${selectedModeInfo?.title ?? selected} defaults`}
              variant="ghost"
              loading={resetting}
              disabled={resetting}
              icon={<MaterialCommunityIcons name="restore" size={18} color={colors.textMuted} />}
              onPress={async () => {
                setResetting(true);
                setError(null);
                try {
                  await resetToModeDefaults(selected);
                  setPreviewConfig(null);
                  setDraft(defaultsForMode(selected));
                  toast.success("Reset complete", `Settings restored to ${selectedModeInfo?.title ?? selected} defaults.`);
                } catch (e: any) {
                  setError(e?.message ?? "Failed to reset");
                } finally {
                  setResetting(false);
                }
              }}
            />
          </View>
        </ScrollView>
      </FadeInView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xl,
  },
  scroll: {
    padding: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
  chip: {
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
  },
  langChip: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    alignItems: "center",
    paddingVertical: tokens.spacing.sm + 2,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    minHeight: 44,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
  },
  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  savedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.xs,
    borderWidth: 1,
  },
  subSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: tokens.spacing.sm,
  },
  chipGroup: {
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  chipGroupLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  schemeChip: {
    flex: 1,
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    minHeight: 60,
    justifyContent: "center",
  },
  swatchOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  swatchInner: {
    width: "100%",
    height: "55%",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: tokens.spacing.md,
  },
});
