import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api } from "../api/client";
import { ProfessionalInvitation } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { TextField } from "../ui/TextField";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";
import { AppText } from "../ui/Text";

type Props = NativeStackScreenProps<MainStackParamList, "Invitations">;

// Invitations are intentionally one-way: the only actions are accept/reject/cancel.
// This keeps the feature aligned with psychological safety (no chat threads).
export function InvitationsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const role = session?.user.role;
  const isParent = role === "PARENT";

  const [sent, setSent] = useState<ProfessionalInvitation[]>([]);
  const [received, setReceived] = useState<ProfessionalInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteeEmail, setInviteeEmail] = useState("");
  const [inviteeRole, setInviteeRole] = useState<"FACILITATOR" | "TEACHER" | "THERAPIST">("FACILITATOR");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      if (isParent) {
        const s = await api.get<{ invitations: ProfessionalInvitation[] }>("/invitations?type=sent", session);
        setSent(s.invitations);
      } else {
        const r = await api.get<{ invitations: ProfessionalInvitation[] }>("/invitations?type=received", session);
        setReceived(r.invitations);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [isParent, session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const pendingReceived = useMemo(() => received.filter((i) => i.status === "PENDING"), [received]);

  return (
    <ScrollScreen>
      <View style={{ gap: 12 }}>
        <ScreenHeader
          title="Invitations"
          subtitle="Build a support team by invitation. This feature has no chat and no threaded messaging."
        />

        {error ? <InlineAlert tone="danger" text={error} /> : null}
        {success ? <InlineAlert tone="success" text={success} /> : null}

        {isParent ? (
          <Card>
            <AppText variant="body" weight="black">
              Invite a professional
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
              Enter an email and choose a role.
            </AppText>

            <View style={{ gap: 10, marginTop: 12 }}>
              <TextField label="Email" value={inviteeEmail} onChangeText={setInviteeEmail} autoCapitalize="none" placeholder="name@example.com" />

              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                {(
                  [
                    { value: "FACILITATOR", label: "Facilitator" },
                    { value: "TEACHER", label: "Teacher" },
                    { value: "THERAPIST", label: "Therapist" }
                  ] as const
                ).map((r) => {
                  const selected = inviteeRole === r.value;
                  return (
                    <Pressable
                      key={r.value}
                      onPress={() => setInviteeRole(r.value)}
                      style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                    >
                      <Card style={{ borderColor: selected ? colors.focusRing : colors.border, borderWidth: selected ? 2 : 1 }}>
                        <Text style={{ color: colors.text, fontWeight: "900" }}>{r.label}</Text>
                      </Card>
                    </Pressable>
                  );
                })}
              </View>

              <TextField
                label="Message (optional)"
                value={message}
                onChangeText={setMessage}
                placeholder="Optional note for the invitee"
                multiline
                style={{ minHeight: 90, textAlignVertical: "top" }}
              />

              <AppButton
                title={sending ? "Sending..." : "Send invitation"}
                loading={sending}
                disabled={sending}
                onPress={async () => {
                  if (!session) return;
                  setSending(true);
                  setError(null);
                  setSuccess(null);
                  try {
                    const res = await api.post<{ linked?: boolean; invitation?: ProfessionalInvitation; link?: string }>(
                      "/invitations",
                      { inviteeEmail: inviteeEmail.trim(), inviteeRole, ...(message.trim() ? { message: message.trim() } : {}) },
                      session
                    );
                    if (res.linked) {
                      setSuccess("User already exists. Connected successfully.");
                    } else {
                      setSuccess("Invitation sent.");
                    }
                    setInviteeEmail("");
                    setMessage("");
                    await load();
                  } catch (e: any) {
                    setError(e?.message ?? "Failed to send invitation");
                  } finally {
                    setSending(false);
                  }
                }}
              />
            </View>
          </Card>
        ) : (
          <Card style={{ backgroundColor: colors.surfaceAlt }}>
            <AppText variant="body" weight="black">
              Pending invitations
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
              You can accept or reject. There are no replies or chat threads.
            </AppText>
            <AppText variant="title" weight="black" style={{ marginTop: 10 }}>
              {loading ? "…" : String(pendingReceived.length)}
            </AppText>
          </Card>
        )}

        {isParent ? (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Sent</Text>
            {sent.length ? (
              sent.map((i) => (
                <Card key={i.id}>
                  <Text style={{ color: colors.text, fontWeight: "900" }}>{i.inviteeEmail}</Text>
                  <Text style={{ color: colors.textMuted, marginTop: 6 }}>
                    Role: {i.inviteeRole} · Status: {i.status} · Expires: {new Date(i.expiresAt).toDateString()}
                  </Text>
                  {i.status === "PENDING" ? (
                    <View style={{ marginTop: 12 }}>
                      <AppButton
                        title="Cancel invitation"
                        variant="secondary"
                        onPress={async () => {
                          if (!session) return;
                          setError(null);
                          try {
                            await api.del(`/invitations/${i.id}`, session);
                            await load();
                          } catch (e: any) {
                            setError(e?.message ?? "Failed to cancel");
                          }
                        }}
                      />
                    </View>
                  ) : null}
                </Card>
              ))
            ) : (
              <Card style={{ backgroundColor: colors.surfaceAlt }}>
                <Text style={{ color: colors.textMuted }}>No invitations sent yet.</Text>
              </Card>
            )}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Received</Text>
            {received.length ? (
              received.map((i) => (
                <Card key={i.id}>
                  <Text style={{ color: colors.text, fontWeight: "900" }}>Role: {i.inviteeRole}</Text>
                  <Text style={{ color: colors.textMuted, marginTop: 6 }}>
                    Status: {i.status} · Expires: {new Date(i.expiresAt).toDateString()}
                  </Text>
                  {i.message ? <Text style={{ color: colors.text, marginTop: 10 }}>Message: {i.message}</Text> : null}
                  {i.status === "PENDING" ? (
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                      <View style={{ flex: 1 }}>
                        <AppButton
                          title="Accept"
                          variant="success"
                          onPress={async () => {
                            if (!session) return;
                            setError(null);
                            try {
                              await api.patch(`/invitations/${i.id}/accept`, {}, session);
                              await load();
                            } catch (e: any) {
                              setError(e?.message ?? "Failed");
                            }
                          }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppButton
                          title="Reject"
                          variant="danger"
                          onPress={async () => {
                            if (!session) return;
                            setError(null);
                            try {
                              await api.patch(`/invitations/${i.id}/reject`, {}, session);
                              await load();
                            } catch (e: any) {
                              setError(e?.message ?? "Failed");
                            }
                          }}
                        />
                      </View>
                    </View>
                  ) : null}
                </Card>
              ))
            ) : (
              <Card style={{ backgroundColor: colors.surfaceAlt }}>
                <Text style={{ color: colors.textMuted }}>No invitations received.</Text>
              </Card>
            )}
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 10 }}>
          <AppButton title={loading ? "Loading..." : "Refresh"} variant="secondary" onPress={() => void load()} />
          <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </ScrollScreen>
  );
}
