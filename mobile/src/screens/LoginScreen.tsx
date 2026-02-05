import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { AuthStackParamList } from "../navigation/AuthStack";
import { AppButton } from "../ui/Button";
import { Screen } from "../ui/Screen";
import { TextField } from "../ui/TextField";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Screen>
      <ScreenHeader title="Welcome back" subtitle="Sign in to continue" />
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
      {error ? <InlineAlert tone="danger" text={error} /> : null}
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
