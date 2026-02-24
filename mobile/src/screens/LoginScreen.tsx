import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AuthStackParamList } from "../navigation/AuthStack";
import { AppButton } from "../ui/Button";
import { TextField } from "../ui/TextField";
import { AppText } from "../ui/Text";
import { Divider } from "../ui/Divider";
import { FadeInView, SlideInView } from "../animation/AnimatedComponents";
import { tokens } from "../theme/tokens";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Hide the navigation bar — we have our own full-screen hero
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleSignIn = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e?.message ?? "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* ── HERO SECTION ─────────────────────────────── */}
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            {/* Decorative circles */}
            <View style={[styles.circle1, { backgroundColor: "rgba(255,255,255,0.08)" }]} />
            <View style={[styles.circle2, { backgroundColor: "rgba(255,255,255,0.06)" }]} />

            <FadeInView style={styles.heroContent}>
              {/* App icon */}
              <View style={styles.logoWrapper}>
                <MaterialCommunityIcons name="school" size={40} color={colors.gradientStart} />
              </View>

              {/* App name */}
              <AppText variant="h1" weight="black" style={styles.appName}>
                EduWave
              </AppText>
              <AppText variant="body" style={styles.tagline}>
                Empowering Every Village Learner
              </AppText>
            </FadeInView>
          </LinearGradient>

          {/* ── FORM CARD ────────────────────────────────── */}
          <SlideInView direction="up" delay={100} style={styles.cardWrapper}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                  ...Platform.select({
                    ios: {
                      shadowColor: "#000",
                      shadowOpacity: 0.1,
                      shadowRadius: 24,
                      shadowOffset: { width: 0, height: -4 },
                    },
                    android: { elevation: 8 },
                  }),
                },
              ]}
            >
              {/* Card header */}
              <View style={styles.cardHeader}>
                <AppText variant="h3" weight="black" style={{ color: colors.text }}>
                  Welcome back
                </AppText>
                <AppText variant="body" tone="muted" style={{ marginTop: tokens.spacing.xs }}>
                  Sign in to your account
                </AppText>
              </View>

              {/* Email field */}
              <TextField
                label="Email address"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                leftIcon={
                  <MaterialCommunityIcons name="email-outline" size={20} color={colors.textMuted} />
                }
              />

              {/* Password field */}
              <TextField
                label="Password"
                secureTextEntry={!showPassword}
                autoComplete="password"
                returnKeyType="done"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                leftIcon={
                  <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} />
                }
                rightIcon={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                }
                onSubmitEditing={handleSignIn}
              />

              {/* Forgot password */}
              <Pressable
                style={styles.forgotRow}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
                onPress={() => {
                  // placeholder — can wire to a ForgotPassword screen later
                }}
              >
                <AppText variant="caption" tone="primary" weight="semibold">
                  Forgot password?
                </AppText>
              </Pressable>

              {/* Error banner */}
              {error ? (
                <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
                  <AppText variant="caption" tone="danger" weight="semibold" style={{ flex: 1 }}>
                    {error}
                  </AppText>
                </View>
              ) : null}

              {/* Sign-in button */}
              <AppButton
                title={loading ? "Signing in…" : "Sign In"}
                variant="gradient"
                loading={loading}
                disabled={loading}
                icon={
                  !loading ? (
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                  ) : undefined
                }
                iconPosition="right"
                onPress={handleSignIn}
              />

              <Divider label="or" style={{ marginVertical: tokens.spacing.sm }} />

              {/* Register */}
              <AppButton
                title="Create an account"
                variant="secondary"
                icon={<MaterialCommunityIcons name="account-plus-outline" size={18} color={colors.primary} />}
                onPress={() => navigation.navigate("Register")}
              />
            </View>
          </SlideInView>

          {/* ── FOOTER ───────────────────────────────────── */}
          <View style={styles.footer}>
            <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
              EduWave Village © {new Date().getFullYear()}
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Hero ──
  hero: {
    height: 280,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroContent: {
    padding: tokens.spacing.xl,
    paddingBottom: tokens.spacing.xxxl,
    alignItems: "flex-start",
    gap: tokens.spacing.xs,
  },
  logoWrapper: {
    width: 68,
    height: 68,
    borderRadius: tokens.radius.xl,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.spacing.sm,
  },
  appName: {
    color: "#fff",
  },
  tagline: {
    color: "rgba(255,255,255,0.85)",
  },
  // Decorative background circles
  circle1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -60,
    right: -50,
  },
  circle2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    top: 40,
    right: 80,
  },

  // ── Card ──
  cardWrapper: {
    marginTop: -36,
    marginHorizontal: tokens.spacing.lg,
    marginBottom: tokens.spacing.lg,
  },
  card: {
    borderRadius: tokens.radius.xxl,
    borderWidth: 1,
    padding: tokens.spacing.xl,
    gap: tokens.spacing.md,
  },
  cardHeader: {
    marginBottom: tokens.spacing.sm,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: -tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },

  // ── Footer ──
  footer: {
    padding: tokens.spacing.xl,
    paddingTop: 0,
    alignItems: "center",
  },
});
