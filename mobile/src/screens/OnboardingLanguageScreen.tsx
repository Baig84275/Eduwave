import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SetupStackParamList } from "../navigation/SetupStack";
import { AppText } from "../ui/Text";
import { tokens } from "../theme/tokens";

type Props = NativeStackScreenProps<SetupStackParamList, "OnboardingLanguage">;

const PRIMARY = "#007B8A";
const DARK = "#1A1A2E";

const LANGUAGES = [
  { code: "en", flag: "🇿🇦", name: "English",   native: "English",   soon: false },
  { code: "af", flag: "🇿🇦", name: "Afrikaans",  native: "Afrikaans",  soon: false },
  { code: "zu", flag: "🇿🇦", name: "isiZulu",    native: "isiZulu",    soon: true  },
  { code: "xh", flag: "🇿🇦", name: "isiXhosa",   native: "isiXhosa",   soon: true  },
  { code: "st", flag: "🇿🇦", name: "Sesotho",    native: "Sesotho",    soon: true  },
];

export function OnboardingLanguageScreen({ navigation }: Props) {
  const [selected, setSelected] = useState("en");

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top gradient area */}
        <View style={styles.top}>
          <AppText style={styles.topEmoji}>🌊</AppText>
          <AppText style={styles.topTitle}>Welcome to EduWave Village</AppText>
          <AppText style={styles.topSub}>Your village for every child.{"\n"}Let's set up your experience.</AppText>
        </View>

        {/* White card */}
        <View style={styles.card}>
          {/* Step dots */}
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          <AppText style={styles.stepLabel}>STEP 1 OF 3 — LANGUAGE</AppText>
          <AppText style={styles.cardTitle}>Choose your language</AppText>

          {LANGUAGES.map((lang) => {
            const isSelected = selected === lang.code;
            const disabled = lang.soon;
            return (
              <Pressable
                key={lang.code}
                style={[
                  styles.langRow,
                  isSelected && styles.langRowSelected,
                  disabled && styles.langRowDisabled,
                ]}
                onPress={() => !disabled && setSelected(lang.code)}
                disabled={disabled}
              >
                <AppText style={styles.langFlag}>{lang.flag}</AppText>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.langName}>{lang.name}</AppText>
                  <AppText style={styles.langNative}>{lang.native}</AppText>
                </View>
                {lang.soon && (
                  <AppText style={styles.langSoon}>Coming soon</AppText>
                )}
              </Pressable>
            );
          })}

          <Pressable
            style={styles.nextBtn}
            onPress={() => navigation.navigate("OnboardingAccessibility", { selectedLanguage: selected })}
          >
            <AppText style={styles.nextBtnText}>Continue →</AppText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PRIMARY },
  scroll: { flexGrow: 1 },
  top: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 20,
    alignItems: "center",
  },
  topEmoji: { fontSize: 36, marginBottom: 6 },
  topTitle: { fontSize: 17, fontWeight: "700", color: "#fff", marginBottom: 4, textAlign: "center" },
  topSub: { fontSize: 11, color: "rgba(255,255,255,0.8)", lineHeight: 17, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    flex: 1,
    padding: 16,
    paddingBottom: 28,
  },
  dots: { flexDirection: "row", gap: 5, justifyContent: "center", marginBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e0e0e0" },
  dotActive: { width: 18, borderRadius: 6, backgroundColor: PRIMARY },
  stepLabel: { fontSize: 9, fontWeight: "700", color: PRIMARY, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: DARK, marginBottom: 13 },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#e4e4e4",
    marginBottom: 7,
    backgroundColor: "#fff",
  },
  langRowSelected: { borderColor: PRIMARY, backgroundColor: "#E0F4F7" },
  langRowDisabled: { opacity: 0.5 },
  langFlag: { fontSize: 20, width: 26, textAlign: "center" },
  langName: { fontSize: 13, fontWeight: "600", color: DARK },
  langNative: { fontSize: 10, color: "#888" },
  langSoon: { fontSize: 9, color: "#bbb" },
  nextBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  nextBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
