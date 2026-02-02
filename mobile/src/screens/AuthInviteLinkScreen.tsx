import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../api/client";
import { ProfessionalInvitation, Role } from "../api/types";
import { AuthStackParamList } from "../navigation/AuthStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<AuthStackParamList, "Invite">;

// Invitation deep links can land before authentication. This screen fetches invitation context
// using a signed token and then routes the user to login or register.
export function AuthInviteLinkScreen({ navigation, route }: Props) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const token = route.params.token;

  const [invitation, setInvitation] = useState<ProfessionalInvitation | null>(null);
  const [userExists, setUserExists] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ invitation: ProfessionalInvitation; userExists: boolean }>(
          `/invitations/public?token=${encodeURIComponent(token)}`
        );
        setInvitation(res.invitation);
        setUserExists(res.userExists);
      } catch (e: any) {
        setError(e?.message ?? "Invalid invitation link");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const role = (invitation?.inviteeRole ?? "FACILITATOR") as Role;

  return (
    <Screen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>Invitation</Text>
        <Text style={{ color: colors.textMuted }}>Open this invitation in the app to accept or reject.</Text>

        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}

        <Card style={{ backgroundColor: colors.surfaceAlt }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>{loading ? "Loading..." : invitation?.inviteeEmail ?? "—"}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 6 }}>
            Role: {invitation?.inviteeRole ?? "—"} · Status: {invitation?.status ?? "—"}
          </Text>
          {invitation?.expiresAt ? (
            <Text style={{ color: colors.textMuted, marginTop: 6 }}>Expires: {new Date(invitation.expiresAt).toDateString()}</Text>
          ) : null}
        </Card>

        {userExists ? (
          <Card style={{ backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.text, fontWeight: "900" }}>Account found</Text>
            <Text style={{ color: colors.textMuted, marginTop: 6 }}>Sign in to accept or reject this invitation.</Text>
          </Card>
        ) : (
          <Card style={{ backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.text, fontWeight: "900" }}>No account found</Text>
            <Text style={{ color: colors.textMuted, marginTop: 6 }}>Create an account to continue.</Text>
          </Card>
        )}

        <View style={{ flexDirection: "row", gap: 10 }}>
          <AppButton title="Sign in" variant="secondary" onPress={() => navigation.navigate("Login")} />
          {!userExists && invitation ? (
            <AppButton
              title="Create account"
              onPress={() =>
                navigation.navigate("Register", {
                  prefillEmail: invitation.inviteeEmail,
                  prefillRole: role as any,
                  invitationToken: token
                })
              }
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

