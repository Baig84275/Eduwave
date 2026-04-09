import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SetupStackParamList } from "../navigation/SetupStack";
import { AccessibilityMode, useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "../ui/Text";
import { tokens } from "../theme/tokens";

type Props = NativeStackScreenProps<SetupStackParamList, "OnboardingConfirm">;

const PRIMARY = "#007B8A";
const DARK = "#1A1A2E";

const MODE_LABELS: Record<string, string> = {
  STANDARD:         "Standard — default experience",
  VISUAL_SUPPORT:   "Visual impairment support",
  READING_DYSLEXIA: "Dyslexia & reading support",
  HEARING_SUPPORT:  "Hearing support",
  MOBILITY_SUPPORT: "Mobility & motor support",
  NEURODIVERSE:     "Neurodiverse & cognitive support",
};

const LANG_LABELS: Record<string, string> = {
  en: "English",
  af: "Afrikaans",
  zu: "isiZulu",
  xh: "isiXhosa",
  st: "Sesotho",
};

export function OnboardingConfirmScreen({ navigation, route }: Props) {
  const { selectedLanguage, selectedMode } = route.params;
  const { setMode } = useAccessibility();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnter = async () => {
    setSaving(true);
    setError(null);
    try {
      await setMode(selectedMode as AccessibilityMode);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save preferences. Please try again.");
      setSaving(false);
    }
    // On success AccessibilityProvider sets hasCompletedSetup=true → RootNavigator shows MainTabs
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top */}
        <View style={styles.top}>
          <AppText style={styles.topEmoji}>🎉</AppText>
          <AppText style={styles.topTitle}>All set!</AppText>
          <AppText style={styles.topSub}>
            Your preferences are saved.{"\n"}Update them anytime in Settings.
          </AppText>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <View style={styles.dots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
          </View>

          <AppText style={styles.stepLabel}>STEP 3 OF 3 — CONFIRM</AppText>
          <AppText style={styles.cardTitle}>Your settings are saved</AppText>

          {/* Preferences box */}
          <View style={styles.prefBox}>
            <AppText style={styles.prefHeader}>SELECTED PREFERENCES</AppText>
            <AppText style={styles.prefItem}>🌐 Language: {LANG_LABELS[selectedLanguage] ?? selectedLanguage}</AppText>
            <AppText style={styles.prefItem}>♿ Accessibility: {MODE_LABELS[selectedMode] ?? selectedMode}</AppText>
          </View>

          {/* Info box */}
          <View style={styles.infoBox}>
            <AppText style={styles.infoText}>
              Go to Profile → Accessibility at any time to update your language, display, or support preferences.
            </AppText>
          </View>

          {/* Quick adjustments */}
          <View style={styles.quickAdj}>
            <AppText style={styles.qaLabel}>Quick adjustments</AppText>
            <View style={styles.qaRow}>
              <AppText style={styles.qaName}>Text size</AppText>
              <View style={styles.szBtns}>
                {["A", "A", "A"].map((label, i) => (
                  <Pressable key={i} style={[styles.szBtn, i === 0 && styles.szBtnActive]}>
                    <AppText style={[{ fontSize: 11 + i * 2 }, i === 0 && { color: "#fff" }]}>{label}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {error ? (
            <AppText style={styles.errorText}>{error}</AppText>
          ) : null}

          <Pressable
            style={[styles.nextBtn, saving && { opacity: 0.7 }]}
            onPress={handleEnter}
            disabled={saving}
          >
            <AppText style={styles.nextBtnText}>
              {saving ? "Setting up…" : "Enter EduWave Village →"}
            </AppText>
          </Pressable>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <AppText style={styles.backBtnText}>← Back</AppText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PRIMARY },
  scroll: { flexGrow: 1 },
  top: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 20, alignItems: "center" },
  topEmoji: { fontSize: 36, marginBottom: 6 },
  topTitle: { fontSize: 17, fontWeight: "700", color: "#fff", marginBottom: 4, textAlign: "center" },
  topSub: { fontSize: 11, color: "rgba(255,255,255,0.8)", lineHeight: 17, textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 20, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, flex: 1, padding: 16, paddingBottom: 28 },
  dots: { flexDirection: "row", gap: 5, justifyContent: "center", marginBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e0e0e0" },
  dotActive: { width: 18, borderRadius: 6, backgroundColor: PRIMARY },
  stepLabel: { fontSize: 9, fontWeight: "700", color: PRIMARY, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: DARK, marginBottom: 12 },
  prefBox: { backgroundColor: "#f8f8f8", borderRadius: 11, padding: 12, marginBottom: 10 },
  prefHeader: { fontSize: 9, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 },
  prefItem: { fontSize: 12, color: DARK, lineHeight: 22 },
  infoBox: { backgroundColor: "#E0F4F7", borderRadius: 11, padding: 12, marginBottom: 10 },
  infoText: { fontSize: 11, color: PRIMARY, lineHeight: 17 },
  quickAdj: { backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#e4e4e4", borderRadius: 11, padding: 12, marginBottom: 12 },
  qaLabel: { fontSize: 11, fontWeight: "700", color: DARK, marginBottom: 9 },
  qaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qaName: { fontSize: 11, color: "#555" },
  szBtns: { flexDirection: "row", gap: 5 },
  szBtn: { backgroundColor: "#f0f0f0", borderRadius: 6, paddingVertical: 4, paddingHorizontal: 9 },
  szBtnActive: { backgroundColor: PRIMARY },
  errorText: { fontSize: 12, color: "#D32F2F", marginBottom: 8, textAlign: "center" },
  nextBtn: { backgroundColor: PRIMARY, borderRadius: 11, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  nextBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  backBtn: { alignItems: "center", paddingVertical: 8, marginTop: 4 },
  backBtnText: { fontSize: 12, color: PRIMARY },
});
