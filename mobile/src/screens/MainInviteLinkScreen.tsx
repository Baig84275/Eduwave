import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../api/client";
import { ProfessionalInvitation } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<MainStackParamList, "Invite">;

// Authenticated invitation deep links support accept/reject in-app.
export function MainInviteLinkScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const token = route.params.token;

  const [invitation, setInvitation] = useState<ProfessionalInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!session) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ invitation: ProfessionalInvitation }>(`/invitations/public?token=${encodeURIComponent(token)}`, session);
        setInvitation(res.invitation);
      } catch (e: any) {
        setError(e?.message ?? "Invalid invitation link");
      } finally {
        setLoading(false);
      }
    })();
  }, [session, token]);

  const canAct =
    Boolean(session) &&
    Boolean(invitation) &&
    invitation!.status === "PENDING" &&
    invitation!.inviteeEmail.toLowerCase() === session!.user.email.toLowerCase() &&
    invitation!.inviteeRole === session!.user.role;

  return (
    <ScrollScreen>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>Invitation</Text>
        <Text style={{ color: colors.textMuted }}>Accept or reject. There are no messages or threads.</Text>

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

        {!canAct && invitation ? (
          <Card style={{ backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.text, fontWeight: "900" }}>Not available for this account</Text>
            <Text style={{ color: colors.textMuted, marginTop: 6 }}>
              Sign in with the invited email and role to respond to this invitation.
            </Text>
          </Card>
        ) : null}

        {canAct && invitation ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppButton
                title={saving ? "Saving..." : "Accept"}
                variant="success"
                loading={saving}
                disabled={saving}
                onPress={async () => {
                  if (!session) return;
                  setSaving(true);
                  setError(null);
                  try {
                    await api.patch(`/invitations/${invitation.id}/accept`, {}, session);
                    navigation.goBack();
                  } catch (e: any) {
                    setError(e?.message ?? "Failed");
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                title={saving ? "Saving..." : "Reject"}
                variant="danger"
                loading={saving}
                disabled={saving}
                onPress={async () => {
                  if (!session) return;
                  setSaving(true);
                  setError(null);
                  try {
                    await api.patch(`/invitations/${invitation.id}/reject`, {}, session);
                    navigation.goBack();
                  } catch (e: any) {
                    setError(e?.message ?? "Failed");
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            </View>
          </View>
        ) : null}

        <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </ScrollScreen>
  );
}

