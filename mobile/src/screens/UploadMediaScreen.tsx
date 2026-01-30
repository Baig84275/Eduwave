import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { uploadFile } from "../api/upload";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { TextField } from "../ui/TextField";

type Props = NativeStackScreenProps<MainStackParamList, "UploadMedia">;

export function UploadMediaScreen({ route, navigation }: Props) {
  const { childId } = route.params;
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const [kind, setKind] = useState<"IMAGE" | "VIDEO" | "DOCUMENT">("IMAGE");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text, letterSpacing: config.typography.letterSpacing }}>
        Upload media
      </Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: -6 }}>Attach photos, videos, or documents</Text>

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <View style={{ minWidth: 110, flexGrow: 1 }}>
          <AppButton title="Image" variant={kind === "IMAGE" ? "primary" : "secondary"} onPress={() => setKind("IMAGE")} />
        </View>
        <View style={{ minWidth: 110, flexGrow: 1 }}>
          <AppButton title="Video" variant={kind === "VIDEO" ? "primary" : "secondary"} onPress={() => setKind("VIDEO")} />
        </View>
        <View style={{ minWidth: 110, flexGrow: 1 }}>
          <AppButton
            title="Document"
            variant={kind === "DOCUMENT" ? "primary" : "secondary"}
            onPress={() => setKind("DOCUMENT")}
          />
        </View>
      </View>

      <Card>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>Selected file</Text>
        <Text style={{ marginTop: 6, color: colors.textMuted }}>{file ? file.name : "None"}</Text>
      </Card>
      <AppButton
        title={file ? "Change file" : "Pick file"}
        variant="secondary"
        onPress={async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All });
          if (res.canceled) return;
          const asset = res.assets[0];
          const uri = asset.uri;
          const type =
            asset.type === "video"
              ? "video/mp4"
              : asset.type === "image"
                ? "image/jpeg"
                : "application/octet-stream";
          setFile({ uri, name: `${kind.toLowerCase()}_${Date.now()}.bin`, type });
        }}
      />

      <TextField
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        multiline
        placeholder="Add context for the parent"
        style={{ minHeight: 110, textAlignVertical: "top" }}
      />

      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}

      <AppButton
        title={loading ? "Uploading..." : "Upload"}
        loading={loading}
        disabled={loading || !file}
        onPress={async () => {
          if (!session || !file) return;
          setLoading(true);
          setError(null);
          try {
            await uploadFile({
              path: `/progress/${childId}/media`,
              session,
              file,
              fields: { kind, ...(note.trim() ? { note: note.trim() } : {}) }
            });
            navigation.goBack();
          } catch (e: any) {
            setError(e?.message ?? "Upload failed");
          } finally {
            setLoading(false);
          }
        }}
      />
    </Screen>
  );
}
