import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { useAuth } from "../auth/AuthContext";
import { AuthStackParamList } from "../navigation/AuthStack";
import { AppButton } from "../ui/Button";
import { Screen } from "../ui/Screen";
import { TextField } from "../ui/TextField";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation, route }: Props) {
  const { register } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const invitationToken = route.params?.invitationToken;
  const [email, setEmail] = useState(route.params?.prefillEmail ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"PARENT" | "FACILITATOR" | "TEACHER" | "THERAPIST">(route.params?.prefillRole ?? "PARENT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Screen>
      <Text style={{ fontSize: 28, fontWeight: "900", color: colors.text, letterSpacing: config.typography.letterSpacing }}>
        Create account
      </Text>
      <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: -6 }}>Choose a role and sign up</Text>

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppButton title="Parent" variant={role === "PARENT" ? "primary" : "secondary"} onPress={() => setRole("PARENT")} />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton
              title="Facilitator"
              variant={role === "FACILITATOR" ? "primary" : "secondary"}
              onPress={() => setRole("FACILITATOR")}
            />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppButton title="Teacher" variant={role === "TEACHER" ? "primary" : "secondary"} onPress={() => setRole("TEACHER")} />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton
              title="Therapist"
              variant={role === "THERAPIST" ? "primary" : "secondary"}
              onPress={() => setRole("THERAPIST")}
            />
          </View>
        </View>
      </View>

      <TextField
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
      />
      <View style={{ gap: 6 }}>
        <TextField
          label="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="Minimum 8 characters"
        />
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>Minimum 8 characters</Text>
      </View>

      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
      <AppButton
        title={loading ? "Creating..." : "Create account"}
        loading={loading}
        disabled={loading}
        onPress={async () => {
          setLoading(true);
          setError(null);
          try {
            await register(email.trim(), password, role, invitationToken);
          } catch (e: any) {
            setError(e?.message ?? "Registration failed");
          } finally {
            setLoading(false);
          }
        }}
      />
      <AppButton title="Back to login" variant="ghost" onPress={() => navigation.navigate("Login")} />
    </Screen>
  );
}
