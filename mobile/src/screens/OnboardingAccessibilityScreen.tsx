import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SetupStackParamList } from "../navigation/SetupStack";
import { AccessibilityMode } from "../accessibility/AccessibilityProvider";
import { AppText } from "../ui/Text";
import { tokens } from "../theme/tokens";

type Props = NativeStackScreenProps<SetupStackParamList, "OnboardingAccessibility">;

const PRIMARY = "#007B8A";
const DARK = "#1A1A2E";

const ACC_OPTIONS: Array<{
  id: AccessibilityMode;
  emoji: string;
  name: string;
  desc: string;
}> = [
  { id: "STANDARD",          emoji: "✅", name: "Standard — no adjustments needed",   desc: "I'm happy with the default settings" },
  { id: "VISUAL_SUPPORT",    emoji: "👁️", name: "Visual impairment support",           desc: "Large text, high contrast, screen reader, text-to-speech" },
  { id: "READING_DYSLEXIA",  emoji: "📖", name: "Dyslexia & reading support",          desc: "OpenDyslexic font, tinted background, wider letter spacing" },
  { id: "HEARING_SUPPORT",   emoji: "🔇", name: "Hearing support",                     desc: "Subtitles on all videos, visual & vibration alerts" },
  { id: "MOBILITY_SUPPORT",  emoji: "🖐️", name: "Mobility & motor support",            desc: "Large tap targets, single-hand mode, switch access" },
  { id: "NEURODIVERSE",      emoji: "🧠", name: "Neurodiverse & cognitive support",    desc: "Reduced motion, calm mode, plain language, focus mode" },
];

export function OnboardingAccessibilityScreen({ navigation, route }: Props) {
  const { selectedLanguage } = route.params;
  const [selected, setSelected] = useState<AccessibilityMode>("STANDARD");

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top */}
        <View style={styles.top}>
          <AppText style={styles.topEmoji}>♿</AppText>
          <AppText style={styles.topTitle}>Make it work for you</AppText>
          <AppText style={styles.topSub}>
            Select any that apply — you can change{"\n"}these at any time from Settings.
          </AppText>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <View style={styles.dots}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
          </View>

          <AppText style={styles.stepLabel}>STEP 2 OF 3 — ACCESSIBILITY</AppText>
          <AppText style={styles.cardTitle}>What would help you most?</AppText>

          {ACC_OPTIONS.map((opt) => {
            const isSelected = selected === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.accRow, isSelected && styles.accRowSelected]}
                onPress={() => setSelected(opt.id)}
              >
                <AppText style={styles.accEmoji}>{opt.emoji}</AppText>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.accName}>{opt.name}</AppText>
                  <AppText style={styles.accDesc}>{opt.desc}</AppText>
                </View>
                <View style={[styles.check, isSelected && styles.checkSelected]}>
                  {isSelected && <AppText style={{ color: "#fff", fontSize: 9 }}>✓</AppText>}
                </View>
              </Pressable>
            );
          })}

          <Pressable
            style={styles.nextBtn}
            onPress={() =>
              navigation.navigate("OnboardingConfirm", {
                selectedLanguage,
                selectedMode: selected,
              })
            }
          >
            <AppText style={styles.nextBtnText}>Continue →</AppText>
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
  cardTitle: { fontSize: 14, fontWeight: "700", color: DARK, marginBottom: 13 },
  accRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 10,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#e4e4e4",
    marginBottom: 7,
    backgroundColor: "#fff",
  },
  accRowSelected: { borderColor: PRIMARY, backgroundColor: "#E0F4F7" },
  accEmoji: { fontSize: 20, width: 28, marginTop: 1 },
  accName: { fontSize: 12, fontWeight: "700", color: DARK },
  accDesc: { fontSize: 10, color: "#888", marginTop: 2, lineHeight: 14 },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  checkSelected: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  nextBtn: { backgroundColor: PRIMARY, borderRadius: 11, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  nextBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  backBtn: { alignItems: "center", paddingVertical: 8, marginTop: 4 },
  backBtnText: { fontSize: 12, color: PRIMARY },
});
