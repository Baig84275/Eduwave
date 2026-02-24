import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { uploadFile } from "../api/upload";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { ScreenHeader } from "../ui/ScreenHeader";
import { AppText } from "../ui/Text";
import { TextField } from "../ui/TextField";
import { InlineAlert } from "../ui/InlineAlert";
import { Badge } from "../ui/Badge";
import { FadeInView } from "../animation/AnimatedComponents";

type Props = NativeStackScreenProps<MainStackParamList, "UploadMedia">;
type MediaKind = "IMAGE" | "VIDEO" | "DOCUMENT";

const KIND_CONFIG: Record<MediaKind, { label: string; icon: string; description: string }> = {
  IMAGE:    { label: "Image",    icon: "image-outline",         description: "Photos and screenshots" },
  VIDEO:    { label: "Video",    icon: "video-outline",         description: "Video recordings" },
  DOCUMENT: { label: "Document", icon: "file-document-outline", description: "PDFs and files" },
};

export function UploadMediaScreen({ route, navigation }: Props) {
  const { childId } = route.params;
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [kind, setKind] = useState<MediaKind>("IMAGE");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <ScrollScreen>
      <FadeInView>
        <View style={{ gap: 16 }}>
          <ScreenHeader title="Upload Media" subtitle="Attach photos, videos, or documents to this child's progress record." />

          {/* Media type selector */}
          <View style={{ gap: 8 }}>
            <AppText variant="label" weight="bold" tone="muted">MEDIA TYPE</AppText>
            <View style={{ gap: 8 }}>
              {(Object.entries(KIND_CONFIG) as [MediaKind, typeof KIND_CONFIG[MediaKind]][]).map(([k, cfg]) => {
                const selected = kind === k;
                return (
                  <Card
                    key={k}
                    pressable
                    onPress={() => setKind(k)}
                    style={{
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 2 : 1,
                      backgroundColor: selected ? colors.surface : colors.surfaceAlt,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: selected ? colors.primary : colors.borderLight,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MaterialCommunityIcons name={cfg.icon as any} size={20} color={selected ? "#fff" : colors.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="body" weight="bold" style={{ color: selected ? colors.primary : colors.text }}>
                          {cfg.label}
                        </AppText>
                        <AppText variant="caption" tone="muted">{cfg.description}</AppText>
                      </View>
                      {selected && <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />}
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>

          {/* File selection */}
          <View style={{ gap: 8 }}>
            <AppText variant="label" weight="bold" tone="muted">SELECTED FILE</AppText>
            <Card variant="solid" style={{ backgroundColor: colors.surfaceAlt }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <MaterialCommunityIcons
                  name={file ? (KIND_CONFIG[kind].icon as any) : "file-outline"}
                  size={24}
                  color={file ? colors.primary : colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  {file ? (
                    <>
                      <AppText variant="body" weight="bold" numberOfLines={1}>{file.name}</AppText>
                      <Badge label={kind} color="primary" variant="subtle" size="sm" style={{ alignSelf: "flex-start", marginTop: 4 }} />
                    </>
                  ) : (
                    <AppText variant="body" tone="muted">No file selected</AppText>
                  )}
                </View>
              </View>
            </Card>
            <AppButton
              title={file ? "Change file" : "Pick file"}
              variant="secondary"
              icon={<MaterialCommunityIcons name="folder-open-outline" size={18} color={colors.textMuted} />}
              onPress={async () => {
                const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All });
                if (res.canceled) return;
                const asset = res.assets[0];
                const type =
                  asset.type === "video" ? "video/mp4" : asset.type === "image" ? "image/jpeg" : "application/octet-stream";
                setFile({ uri: asset.uri, name: `${kind.toLowerCase()}_${Date.now()}.bin`, type });
              }}
            />
          </View>

          <TextField
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Add context for the parent"
            style={{ minHeight: 110, textAlignVertical: "top" }}
          />

          {error ? <InlineAlert tone="danger" text={error} /> : null}

          <AppButton
            title="Upload"
            loading={loading}
            disabled={loading || !file}
            icon={<MaterialCommunityIcons name="upload" size={18} color="#fff" />}
            onPress={async () => {
              if (!session || !file) return;
              setLoading(true);
              setError(null);
              try {
                await uploadFile({
                  path: `/progress/${childId}/media`,
                  session,
                  file,
                  fields: { kind, ...(note.trim() ? { note: note.trim() } : {}) },
                });
                navigation.goBack();
              } catch (e: any) {
                setError(e?.message ?? "Upload failed");
              } finally {
                setLoading(false);
              }
            }}
          />
        </View>
      </FadeInView>
    </ScrollScreen>
  );
}
