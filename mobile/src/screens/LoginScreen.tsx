import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Text } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { useAuth } from "../auth/AuthContext";
import { AuthStackParamList } from "../navigation/AuthStack";
import { AppButton } from "../ui/Button";
import { Screen } from "../ui/Screen";
import { TextField } from "../ui/TextField";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Screen>
      <Text style={{ fontSize: 28, fontWeight: "900", color: colors.text, letterSpacing: config.typography.letterSpacing }}>
        Welcome back
      </Text>
      <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: -6 }}>
        Sign in to continue
      </Text>
      <TextField
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
      />
      <TextField
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
      />
      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
      <AppButton
        title={loading ? "Signing in..." : "Sign In"}
        loading={loading}
        disabled={loading}
        onPress={async () => {
          setLoading(true);
          setError(null);
          try {
            await login(email.trim(), password);
          } catch (e: any) {
            setError(e?.message ?? "Login failed");
          } finally {
            setLoading(false);
          }
        }}
      />
      <AppButton title="Create account" variant="secondary" onPress={() => navigation.navigate("Register")} />
    </Screen>
  );
}
