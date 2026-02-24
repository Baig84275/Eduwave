import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Image, View } from "react-native";
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
import { DatePickerField } from "../ui/DatePickerField";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";
import { AppText } from "../ui/Text";

type Props = NativeStackScreenProps<MainStackParamList, "CreateChild">;

export function CreateChildScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [healthStatus, setHealthStatus] = useState("");
  const [profileUri, setProfileUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Screen>
      <ScreenHeader title="Create child profile" subtitle="Add details and an optional photo" />

      <TextField label="Name" value={name} onChangeText={setName} placeholder="Child name" />
      <DatePickerField
        label="Date of birth"
        value={dateOfBirth}
        onChange={setDateOfBirth}
        maxDate={new Date()}
        placeholder="Select date of birth"
      />
      <TextField
        label="Health status (optional)"
        value={healthStatus}
        onChangeText={setHealthStatus}
        placeholder="e.g. Asthma"
      />

      <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="label" weight="semibold">
            Profile picture
          </AppText>
          <AppText variant="caption" tone="muted">
            {profileUri ? "Selected" : "Optional"}
          </AppText>
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
          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });
          if (!res.canceled) setProfileUri(res.assets[0].uri);
        }}
      />

      {error ? <InlineAlert tone="danger" text={error} /> : null}
      <AppButton
        title={loading ? "Creating..." : "Create child"}
        loading={loading}
        disabled={loading}
        onPress={async () => {
          if (!session) return;
          setLoading(true);
          setError(null);
          try {
            if (!dateOfBirth) { setError("Date of birth is required"); setLoading(false); return; }
            const isoDob = dateOfBirth.toISOString();
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
