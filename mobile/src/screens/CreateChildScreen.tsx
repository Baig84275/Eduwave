import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Image, Text, View } from "react-native";
import { api } from "../api/client";
import { uploadFile } from "../api/upload";
import { Child } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { TextField } from "../ui/TextField";

type Props = NativeStackScreenProps<MainStackParamList, "CreateChild">;

export function CreateChildScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [healthStatus, setHealthStatus] = useState("");
  const [profileUri, setProfileUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text, letterSpacing: config.typography.letterSpacing }}>
        Create child profile
      </Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: -6 }}>Add details and an optional photo</Text>

      <TextField label="Name" value={name} onChangeText={setName} placeholder="Child name" />
      <TextField
        label="Date of birth"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
      <TextField
        label="Health status (optional)"
        value={healthStatus}
        onChangeText={setHealthStatus}
        placeholder="e.g. Asthma"
      />

      <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>Profile picture</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {profileUri ? "Selected" : "Optional"}
          </Text>
        </View>
        {profileUri ? (
          <Image
            source={{ uri: profileUri }}
            style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceAlt }}
          />
        ) : (
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceAlt }} />
        )}
      </Card>
      <AppButton
        title={profileUri ? "Change profile picture" : "Pick profile picture"}
        variant="secondary"
        onPress={async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
          if (!res.canceled) setProfileUri(res.assets[0].uri);
        }}
      />

      {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
      <AppButton
        title={loading ? "Creating..." : "Create child"}
        loading={loading}
        disabled={loading}
        onPress={async () => {
          if (!session) return;
          setLoading(true);
          setError(null);
          try {
            const isoDob = new Date(`${dateOfBirth}T00:00:00.000Z`).toISOString();
            const created = await api.post<{ child: Child }>(
              "/children",
              { name: name.trim(), dateOfBirth: isoDob, healthStatus: healthStatus.trim() || undefined },
              session
            );
            const childId = created.child.id;
            if (profileUri) {
              await uploadFile<{ child: { id: string; profilePictureUrl: string } }>({
                path: `/children/${childId}/profile-picture`,
                session,
                file: { uri: profileUri, name: "profile.jpg", type: "image/jpeg" }
              });
            }
            navigation.replace("Child", { childId });
          } catch (e: any) {
            setError(e?.message ?? "Failed to create");
          } finally {
            setLoading(false);
          }
        }}
      />
    </Screen>
  );
}
