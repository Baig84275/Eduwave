import { NativeStackScreenProps } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useState } from "react";
import { Alert, FlatList, Image, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { Resource, ResourceCategory } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { TextField } from "../ui/TextField";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { getApiBaseUrl } from "../api/baseUrl";

type Props = NativeStackScreenProps<MainStackParamList, "Resources">;

const LOCATION_CACHE_KEY = "eduwave.location.last.v1";

const categories: Array<{ value: ResourceCategory; label: string }> = [
  { value: "SCHOOL", label: "Schools" },
  { value: "THERAPIST_SPECIALIST", label: "Therapists / Specialists" },
  { value: "NGO", label: "NGOs" },
  { value: "ORGANISATION", label: "Organisations" },
  { value: "SUPPORT_SERVICE", label: "Support services" }
];

export function ResourceDirectoryScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const canUpload = session?.user.role === "ORG_ADMIN" || session?.user.role === "ADMIN" || session?.user.role === "SUPER_ADMIN";

  const [resources, setResources] = useState<Resource[]>([]);
  const [q, setQ] = useState("");
  const [province, setProvince] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState<ResourceCategory | "">("");
  const [nearMe, setNearMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      if (nearMe) {
        const coords = await getCachedOrCurrentLocation();
        const qs = new URLSearchParams();
        qs.set("lat", String(coords.latitude));
        qs.set("lng", String(coords.longitude));
        qs.set("radius", "50");
        if (category) qs.set("category", category);
        const path = `/resources/nearby?${qs.toString()}`;
        const res = await api.get<{ resources: Resource[] }>(path, session);
        setResources(res.resources);
      } else {
        const qs = new URLSearchParams();
        if (q.trim()) qs.set("q", q.trim());
        if (province.trim()) qs.set("province", province.trim());
        if (category) qs.set("category", category);
        if (tags.trim()) qs.set("tags", tags.trim());
        const path = `/resources${qs.toString() ? `?${qs.toString()}` : ""}`;
        const res = await api.get<{ resources: Resource[] }>(path, session);
        setResources(res.resources);
      }
    } catch (e: any) {
      if (nearMe) {
        setNearMe(false);
        setError(e?.message ?? "Location access not available. Use province/city search.");
      } else {
        setError(e?.message ?? "Failed to load resources");
      }
    } finally {
      setLoading(false);
    }
  }, [category, nearMe, province, q, session, tags]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <Screen>
      <FlatList
        data={resources}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>South Africa Resources</Text>
            <Text style={{ color: colors.textMuted }}>
              Search a structured directory of support resources. No bookings, payments, or reviews.
            </Text>

            <TextField label="Search" value={q} onChangeText={setQ} placeholder="Name, city, description" />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <TextField label="Province" value={province} onChangeText={setProvince} placeholder="e.g., Gauteng" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Tags" value={tags} onChangeText={setTags} placeholder="Autism, ADHD" />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "800", color: colors.text }}>Category</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <Pressable
                  onPress={() => setCategory("")}
                  style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                >
                  <Card style={{ borderColor: !category ? colors.focusRing : colors.border, borderWidth: !category ? 2 : 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>All</Text>
                  </Card>
                </Pressable>
                {categories.map((c) => {
                  const selected = category === c.value;
                  return (
                    <Pressable
                      key={c.value}
                      onPress={() => setCategory(c.value)}
                      style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                    >
                      <Card style={{ borderColor: selected ? colors.focusRing : colors.border, borderWidth: selected ? 2 : 1 }}>
                        <Text style={{ color: colors.text, fontWeight: "800" }}>{c.label}</Text>
                      </Card>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                onPress={load}
                disabled={loading}
                style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
              >
                <Card style={{ backgroundColor: colors.primary }}>
                  <Text style={{ color: "white", fontWeight: "900" }}>{loading ? "Loading..." : "Apply filters"}</Text>
                </Card>
              </Pressable>
              <Pressable
                onPress={async () => {
                  setError(null);
                  if (!nearMe) {
                    const ok = await confirmLocationUse();
                    if (!ok) return;
                  }
                  setNearMe((prev) => !prev);
                  setTimeout(() => {
                    void load();
                  }, 0);
                }}
                style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
              >
                <Card style={{ backgroundColor: nearMe ? colors.primaryDark : colors.surfaceAlt }}>
                  <Text style={{ color: nearMe ? "white" : colors.text, fontWeight: "900" }}>{nearMe ? "Near me: On" : "Near me"}</Text>
                </Card>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate("ResourcesMap")}
                style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
              >
                <Card style={{ backgroundColor: colors.surfaceAlt }}>
                  <Text style={{ color: colors.text, fontWeight: "900" }}>Map view</Text>
                </Card>
              </Pressable>
              <Text style={{ color: colors.textMuted }}>{resources.length} results</Text>
            </View>

            {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <Card style={{ backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.text, fontWeight: "900" }}>No results</Text>
            <Text style={{ color: colors.textMuted, marginTop: 6 }}>
              Try changing filters, or clear the search and tags.
            </Text>
          </Card>
        }
        renderItem={({ item }) => {
          return (
            <Card>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: "100%", height: 160, borderRadius: 12, marginBottom: 10, backgroundColor: colors.surfaceAlt }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: 160,
                    borderRadius: 12,
                    marginBottom: 10,
                    backgroundColor: colors.surfaceAlt,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: colors.border
                  }}
                >
                  <MaterialCommunityIcons
                    name={iconForCategory(item.category)}
                    size={44}
                    color={colorForCategory(item.category)}
                  />
                  <Text style={{ marginTop: 8, color: colors.textMuted, fontWeight: "800" }}>{labelForCategory(item.category)}</Text>
                </View>
              )}

              <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                {item.city}, {item.province} · {item.category}
              </Text>
              {item.address ? <Text style={{ color: colors.textMuted, marginTop: 4 }}>{item.address}</Text> : null}
              {typeof item.distanceKm === "number" ? (
                <Text style={{ color: colors.textMuted, marginTop: 4 }}>Distance: {item.distanceKm.toFixed(1)} km</Text>
              ) : null}
              {item.description ? <Text style={{ color: colors.text, marginTop: 8 }}>{item.description}</Text> : null}
              {item.contactInfo ? (
                <Text style={{ color: colors.textMuted, marginTop: 8 }}>Contact: {item.contactInfo}</Text>
              ) : null}
              {item.tags?.length ? (
                <Text style={{ color: colors.textMuted, marginTop: 8 }}>Tags: {item.tags.join(", ")}</Text>
              ) : null}

              {canUpload ? (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <Pressable
                    onPress={async () => {
                      if (!session) return;
                      setUploadingId(item.id);
                      setError(null);
                      try {
                        const picked = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          quality: 0.85
                        });
                        if (picked.canceled || !picked.assets?.length) {
                          setUploadingId(null);
                          return;
                        }
                        const asset = picked.assets[0];
                        const { key } = await uploadResourceImage(session.accessToken, asset.uri);
                        await api.patch<{ resource: Resource }>(`/resources/${item.id}`, { imageUrl: key }, session);
                        await load();
                      } catch (e: any) {
                        setError(e?.message ?? "Failed to upload image");
                      } finally {
                        setUploadingId(null);
                      }
                    }}
                    disabled={uploadingId === item.id}
                    style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                  >
                    <Card style={{ backgroundColor: colors.surfaceAlt }}>
                      <Text style={{ color: colors.text, fontWeight: "900" }}>
                        {uploadingId === item.id ? "Uploading..." : "Upload image"}
                      </Text>
                    </Card>
                  </Pressable>
                </View>
              ) : null}
            </Card>
          );
        }}
      />
    </Screen>
  );
}

function iconForCategory(category: ResourceCategory): any {
  if (category === "SCHOOL") return "school";
  if (category === "THERAPIST_SPECIALIST") return "heart-pulse";
  if (category === "NGO") return "hand-heart";
  if (category === "SUPPORT_SERVICE") return "lifebuoy";
  return "map-marker";
}

function colorForCategory(category: ResourceCategory): string {
  if (category === "SCHOOL") return "#2563EB";
  if (category === "THERAPIST_SPECIALIST") return "#DB2777";
  if (category === "NGO") return "#16A34A";
  if (category === "SUPPORT_SERVICE") return "#F97316";
  return "#64748B";
}

function labelForCategory(category: ResourceCategory): string {
  if (category === "SCHOOL") return "School";
  if (category === "THERAPIST_SPECIALIST") return "Therapy";
  if (category === "NGO") return "NGO";
  if (category === "SUPPORT_SERVICE") return "Support";
  return "Resource";
}

async function uploadResourceImage(accessToken: string, uri: string): Promise<{ key: string; url: string }> {
  const form = new FormData();
  const name = uri.split("/").pop() || `resource-${Date.now()}.jpg`;
  const ext = name.split(".").pop()?.toLowerCase();
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  form.append("file", { uri, name, type } as any);

  const res = await fetch(`${getApiBaseUrl()}/upload/resource-image`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
    body: form
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof json?.error === "string" ? json.error : "Upload failed";
    throw new Error(message);
  }
  return json as any;
}

function confirmLocationUse(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "Use your location?",
      "EduWave can use your location to find nearby support services. Your location is only used for this search.",
      [
        { text: "Not now", style: "cancel", onPress: () => resolve(false) },
        { text: "Continue", onPress: () => resolve(true) }
      ]
    );
  });
}

async function getCachedOrCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.latitude && parsed?.longitude && typeof parsed?.ts === "number") {
        const ageMs = Date.now() - parsed.ts;
        if (ageMs < 5 * 60 * 1000) {
          return { latitude: Number(parsed.latitude), longitude: Number(parsed.longitude) };
        }
      }
    }
  } catch (e) {
    void e;
  }

  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) throw new Error("Location permission denied");
  const loc = await Location.getCurrentPositionAsync({});
  const value = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, ts: Date.now() };
  try {
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(value));
  } catch (e) {
    void e;
  }
  return { latitude: value.latitude, longitude: value.longitude };
}
