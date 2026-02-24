import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { ProfessionalInvitation } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { TextField } from "../ui/TextField";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";
import { AppText } from "../ui/Text";
import { Badge } from "../ui/Badge";
import { Divider } from "../ui/Divider";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonListItem } from "../ui/Skeleton";
import { FadeInView, SlideInView } from "../animation/AnimatedComponents";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<MainStackParamList, "Invitations">;
type InviteeRole = "FACILITATOR" | "TEACHER" | "THERAPIST";

const ROLE_CONFIG: Record<InviteeRole, { label: string; icon: string; description: string }> = {
  FACILITATOR: { label: "Facilitator", icon: "account-heart-outline", description: "Day-to-day support" },
  TEACHER:     { label: "Teacher",     icon: "school-outline",         description: "Educational support" },
  THERAPIST:   { label: "Therapist",   icon: "medical-bag",            description: "Therapeutic support" },
};

const STATUS_BADGE: Record<string, { color: "success" | "warning" | "neutral" | "danger"; label: string }> = {
  PENDING:   { color: "warning", label: "Pending"   },
  ACCEPTED:  { color: "success", label: "Accepted"  },
  REJECTED:  { color: "danger",  label: "Rejected"  },
  CANCELLED: { color: "neutral", label: "Cancelled" },
  EXPIRED:   { color: "neutral", label: "Expired"   },
};

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
  const [actionError, setActionError] = useState<string | null>(null);

  const [inviteeEmail, setInviteeEmail] = useState("");
  const [inviteeRole, setInviteeRole] = useState<InviteeRole>("FACILITATOR");
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

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const pendingReceived = useMemo(() => received.filter((i) => i.status === "PENDING"), [received]);

  const handleAction = async (fn: () => Promise<void>) => {
    setActionError(null);
    try {
      await fn();
      await load();
    } catch (e: any) {
      setActionError(e?.message ?? "Action failed");
    }
  };

  return (
    <ScrollScreen>
      <FadeInView>
        <View style={{ gap: 16 }}>
          <ScreenHeader
            title="Invitations"
            subtitle="Build a support team by invitation. No chat or threaded messaging."
          />

          {error ? <InlineAlert tone="danger" text={error} /> : null}
          {actionError ? <InlineAlert tone="danger" text={actionError} /> : null}
          {success ? <InlineAlert tone="success" text={success} /> : null}

          {/* Parent: send invitation form */}
          {isParent ? (
            <SlideInView direction="up" delay={100}>
              <Card variant="elevated" elevation="md">
                <View style={{ gap: 4, marginBottom: 12 }}>
                  <AppText variant="body" weight="bold">Invite a professional</AppText>
                  <AppText variant="caption" tone="muted">Enter an email and choose a role.</AppText>
                </View>
                <Divider style={{ marginBottom: 12 }} />
                <View style={{ gap: 12 }}>
                  <TextField
                    label="Email"
                    value={inviteeEmail}
                    onChangeText={setInviteeEmail}
                    autoCapitalize="none"
                    placeholder="name@example.com"
                    leftIcon={<MaterialCommunityIcons name="email-outline" size={18} color={colors.textMuted} />}
                  />

                  <View style={{ gap: 6 }}>
                    <AppText variant="label" weight="bold" tone="muted">ROLE</AppText>
                    <View style={{ gap: 8 }}>
                      {(Object.entries(ROLE_CONFIG) as [InviteeRole, typeof ROLE_CONFIG[InviteeRole]][]).map(([r, cfg]) => {
                        const selected = inviteeRole === r;
                        return (
                          <Card
                            key={r}
                            pressable
                            onPress={() => setInviteeRole(r)}
                            style={{
                              borderColor: selected ? colors.primary : colors.border,
                              borderWidth: selected ? 2 : 1,
                              backgroundColor: selected ? colors.surface : colors.surfaceAlt,
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                              <MaterialCommunityIcons name={cfg.icon as any} size={20} color={selected ? colors.primary : colors.textMuted} />
                              <View style={{ flex: 1 }}>
                                <AppText variant="label" weight="bold" style={{ color: selected ? colors.primary : colors.text }}>
                                  {cfg.label}
                                </AppText>
                                <AppText variant="caption" tone="muted">{cfg.description}</AppText>
                              </View>
                              {selected && <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />}
                            </View>
                          </Card>
                        );
                      })}
                    </View>
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
                    title="Send invitation"
                    loading={sending}
                    disabled={sending || !inviteeEmail.trim()}
                    icon={<MaterialCommunityIcons name="send-outline" size={18} color="#fff" />}
                    onPress={async () => {
                      if (!session) return;
                      setSending(true);
                      setError(null);
                      setSuccess(null);
                      try {
                        const res = await api.post<{ linked?: boolean; invitation?: ProfessionalInvitation }>(
                          "/invitations",
                          { inviteeEmail: inviteeEmail.trim(), inviteeRole, ...(message.trim() ? { message: message.trim() } : {}) },
                          session
                        );
                        setSuccess(res.linked ? "User already exists — connected successfully." : "Invitation sent successfully.");
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
            </SlideInView>
          ) : (
            /* Professional: pending count */
            <SlideInView direction="up" delay={100}>
              <Card variant="elevated" elevation="md">
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ gap: 4 }}>
                    <AppText variant="body" weight="bold">Pending invitations</AppText>
                    <AppText variant="caption" tone="muted">Accept or reject — no replies or chat threads.</AppText>
                  </View>
                  <Badge
                    label={loading ? "…" : String(pendingReceived.length)}
                    color={pendingReceived.length > 0 ? "warning" : "neutral"}
                    variant="solid"
                  />
                </View>
              </Card>
            </SlideInView>
          )}

          <Divider label={isParent ? "SENT INVITATIONS" : "RECEIVED INVITATIONS"} />

          {loading ? (
            <View style={{ gap: 8 }}>{[1, 2, 3].map((i) => <SkeletonListItem key={i} />)}</View>
          ) : isParent ? (
            sent.length === 0 ? (
              <EmptyState title="No invitations sent yet" message="Send your first invitation above to build your support team." />
            ) : (
              <View style={{ gap: 8 }}>
                {sent.map((inv, index) => {
                  const statusCfg = STATUS_BADGE[inv.status] ?? { color: "neutral" as const, label: inv.status };
                  return (
                    <SlideInView key={inv.id} direction="up" delay={index * 50}>
                      <Card variant="elevated" elevation="sm">
                        <View style={{ gap: 8 }}>
                          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                            <View style={{ flex: 1 }}>
                              <AppText variant="body" weight="bold" numberOfLines={1}>{inv.inviteeEmail}</AppText>
                              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                                {inv.inviteeRole} · Expires {new Date(inv.expiresAt).toDateString()}
                              </AppText>
                            </View>
                            <Badge label={statusCfg.label} color={statusCfg.color} variant="subtle" size="sm" />
                          </View>
                          {inv.status === "PENDING" && (
                            <AppButton
                              title="Cancel"
                              variant="ghost"
                              size="sm"
                              onPress={() => handleAction(() => api.del(`/invitations/${inv.id}`, session!))}
                            />
                          )}
                        </View>
                      </Card>
                    </SlideInView>
                  );
                })}
              </View>
            )
          ) : received.length === 0 ? (
            <EmptyState title="No invitations received" message="When a parent invites you, it will appear here." />
          ) : (
            <View style={{ gap: 8 }}>
              {received.map((inv, index) => {
                const statusCfg = STATUS_BADGE[inv.status] ?? { color: "neutral" as const, label: inv.status };
                return (
                  <SlideInView key={inv.id} direction="up" delay={index * 50}>
                    <Card variant="elevated" elevation="sm">
                      <View style={{ gap: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                          <View style={{ flex: 1 }}>
                            <AppText variant="body" weight="bold">{inv.inviteeRole}</AppText>
                            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                              Expires {new Date(inv.expiresAt).toDateString()}
                            </AppText>
                          </View>
                          <Badge label={statusCfg.label} color={statusCfg.color} variant="subtle" size="sm" />
                        </View>
                        {inv.message ? (
                          <Card variant="solid" style={{ backgroundColor: colors.surfaceAlt }}>
                            <AppText variant="caption" tone="muted">Message from parent</AppText>
                            <AppText variant="body" style={{ marginTop: 4 }}>{inv.message}</AppText>
                          </Card>
                        ) : null}
                        {inv.status === "PENDING" && (
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <View style={{ flex: 1 }}>
                              <AppButton
                                title="Accept"
                                variant="success"
                                size="sm"
                                icon={<MaterialCommunityIcons name="check" size={16} color="#fff" />}
                                onPress={() => handleAction(() => api.patch(`/invitations/${inv.id}/accept`, {}, session!))}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <AppButton
                                title="Reject"
                                variant="danger"
                                size="sm"
                                icon={<MaterialCommunityIcons name="close" size={16} color="#fff" />}
                                onPress={() => handleAction(() => api.patch(`/invitations/${inv.id}/reject`, {}, session!))}
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    </Card>
                  </SlideInView>
                );
              })}
            </View>
          )}

          <AppButton
            title="Refresh"
            variant="secondary"
            loading={loading}
            icon={<MaterialCommunityIcons name="refresh" size={18} color={colors.textMuted} />}
            onPress={() => void load()}
          />
        </View>
      </FadeInView>
    </ScrollScreen>
  );
}
