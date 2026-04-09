import { NativeStackScreenProps } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { Resource, ResourceCategory } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ResourcesStackParamList } from "../navigation/stacks/ResourcesStack";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { getApiBaseUrl } from "../api/baseUrl";
import { AppText } from "../ui/Text";
import { tokens } from "../theme/tokens";
import { useToast } from "../ui/ToastProvider";
import { haptics } from "../animation";

type Props = NativeStackScreenProps<ResourcesStackParamList, "ResourceDirectory">;

const PRIMARY = "#007B8A";
const LOCATION_CACHE_KEY = "eduwave.location.last.v1";

const CHIP_FILTERS = [
  { value: "" as ResourceCategory | "", label: "All" },
  { value: "" as ResourceCategory | "", label: "⭐ SN Friendly" },
  { value: "THERAPIST_SPECIALIST" as ResourceCategory, label: "Therapy" },
  { value: "SCHOOL" as ResourceCategory, label: "Medical" },
  { value: "SCHOOL" as ResourceCategory, label: "Schools" },
  { value: "SUPPORT_SERVICE" as ResourceCategory, label: "Activities" },
  { value: "NGO" as ResourceCategory, label: "Outings" },
];

function StarRating({ rating }: { rating?: number }) {
  const r = rating ?? 5;
  const stars = Array.from({ length: 5 }, (_, i) => (i < r ? "★" : "☆")).join("");
  return <AppText style={styles.stars}>{stars}</AppText>;
}

export function ResourceDirectoryScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const toast = useToast();

  const canUpload =
    session?.user.role === "ORG_ADMIN" ||
    session?.user.role === "ADMIN" ||
    session?.user.role === "SUPER_ADMIN";

  const [resources, setResources] = useState<Resource[]>([]);
  const [q, setQ] = useState("");
  const [province] = useState("");
  const [city, setCity] = useState("");
  const [town, setTown] = useState("");
  const [tags] = useState("");
  const [category, setCategory] = useState<ResourceCategory | "">("");
  const [nearMe, setNearMe] = useState(false);
  const [activeChip, setActiveChip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = useCallback(
    async (showLoading = true) => {
      if (!session) return;
      if (showLoading) setLoading(true);
      try {
        if (nearMe) {
          const { coords, place } = await getCachedOrCurrentLocationAndPlace();
          if (!city.trim() && place.city) setCity(place.city);
          if (!town.trim() && place.town) setTown(place.town);
          const qs = new URLSearchParams();
          qs.set("lat", String(coords.latitude));
          qs.set("lng", String(coords.longitude));
          qs.set("radius", "50");
          if (category) qs.set("category", category);
          if (province.trim()) qs.set("province", province.trim());
          const res = await api.get<{ resources: Resource[] }>(`/resources/nearby?${qs.toString()}`, session);
          setResources(res.resources);
        } else {
          const qs = new URLSearchParams();
          if (q.trim()) qs.set("q", q.trim());
          if (province.trim()) qs.set("province", province.trim());
          if (city.trim()) qs.set("city", city.trim());
          if (town.trim()) qs.set("town", town.trim());
          if (category) qs.set("category", category);
          if (tags.trim()) qs.set("tags", tags.trim());
          const path = `/resources${qs.toString() ? `?${qs.toString()}` : ""}`;
          const res = await api.get<{ resources: Resource[] }>(path, session);
          setResources(res.resources);
        }
      } catch (e: any) {
        const msg = e?.message ?? "Failed to load resources";
        if (nearMe) {
          setNearMe(false);
          toast.warning("Location unavailable", msg);
        } else {
          toast.error("Error", msg);
        }
      } finally {
        setLoading(false);
      }
    },
    [category, city, nearMe, province, q, session, tags, toast, town]
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleNearMeToggle = async () => {
    haptics.light();
    if (!nearMe) {
      const ok = await confirmLocationUse();
      if (!ok) return;
    }
    setNearMe((prev) => !prev);
    setTimeout(() => void load(), 50);
  };

  const renderItem = ({ item }: { item: Resource }) => (
    <View style={styles.resCard}>
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.resImage} resizeMode="cover" />
      )}
      <View style={styles.resBody}>
        <View style={styles.resTopRow}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.resName}>{item.name}</AppText>
            <AppText style={styles.resType}>
              {[item.category?.replace(/_/g, " "), item.city].filter(Boolean).join(" · ")}
            </AppText>
          </View>
          <StarRating rating={(item as any).rating} />
        </View>
        {item.description ? (
          <AppText style={styles.resDesc} numberOfLines={2}>{item.description}</AppText>
        ) : null}
        {(item as any).specialNeedsRating || item.tags?.length ? (
          <View style={styles.snTag}>
            <AppText style={styles.snTagText}>✓ Special Needs Friendly</AppText>
          </View>
        ) : null}
        {item.contactInfo ? (
          <View style={styles.resMeta}>
            <MaterialCommunityIcons name="phone-outline" size={12} color={PRIMARY} />
            <AppText style={[styles.resMetaText, { color: PRIMARY }]}>{item.contactInfo}</AppText>
          </View>
        ) : null}
        {canUpload && (
          <Pressable
            style={styles.uploadImgBtn}
            onPress={async () => {
              if (!session) return;
              setUploadingId(item.id);
              try {
                const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
                if (picked.canceled || !picked.assets?.length) return;
                const asset = picked.assets[0];
                const { key } = await uploadResourceImage(session.accessToken, asset.uri);
                await api.patch<{ resource: Resource }>(`/resources/${item.id}`, { imageUrl: key }, session);
                toast.success("Image uploaded", `Photo updated for ${item.name}`);
                void load(false);
              } catch (e: any) {
                toast.error("Upload failed", e?.message ?? "Could not upload image");
              } finally {
                setUploadingId(null);
              }
            }}
          >
            <MaterialCommunityIcons name="camera-plus-outline" size={14} color={PRIMARY} />
            <AppText style={{ fontSize: 10, color: PRIMARY, marginLeft: 4 }}>
              {uploadingId === item.id ? "Uploading…" : "Upload photo"}
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Teal header */}
      <View style={styles.header}>
        <AppText style={styles.headerTitle}>Resource Hub</AppText>
        <AppText style={styles.headerSub}>Find anything for your child</AppText>
      </View>

      {/* Search row */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <MaterialCommunityIcons name="magnify" size={16} color="#999" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="🔍  Search services, places..."
            placeholderTextColor="#aaa"
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => void load()}
            returnKeyType="search"
          />
        </View>
        <Pressable
          style={[styles.mapBtn, nearMe && styles.mapBtnActive]}
          onPress={handleNearMeToggle}
          accessibilityRole="button"
        >
          <AppText style={[styles.mapBtnText, nearMe && { color: "#fff" }]}>
            {nearMe ? "📍 Near" : "Map"}
          </AppText>
        </Pressable>
        <Pressable
          style={styles.mapNavBtn}
          onPress={() => navigation.navigate("ResourcesMap")}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="map-outline" size={16} color={PRIMARY} />
        </Pressable>
      </View>

      {/* Chip row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {CHIP_FILTERS.map((chip, i) => (
          <Pressable
            key={`${chip.label}-${i}`}
            style={[styles.chip, activeChip === i && styles.chipActive]}
            onPress={() => {
              haptics.selection();
              setActiveChip(i);
              if (chip.value !== "") setCategory(chip.value);
              else setCategory("");
              setTimeout(() => void load(), 50);
            }}
          >
            <AppText style={[styles.chipText, activeChip === i && styles.chipTextActive]}>
              {chip.label}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Map placeholder */}
      <Pressable style={styles.mapBox} onPress={() => navigation.navigate("ResourcesMap")}>
        <MaterialCommunityIcons name="map-marker-multiple" size={18} color="#3A9E6F" />
        <AppText style={styles.mapBoxText}>Interactive map view · Cape Town</AppText>
      </Pressable>

      {/* Results */}
      <AppText style={styles.sectionTitle}>Results near you</AppText>
      <FlatList
        data={resources}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <AppText style={{ color: "#888", fontSize: 13 }}>Loading resources…</AppText>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <AppText style={{ fontSize: 28, marginBottom: 8 }}>📍</AppText>
              <AppText style={{ fontWeight: "700", color: "#1A1A2E", marginBottom: 4 }}>No resources found</AppText>
              <AppText style={{ color: "#888", fontSize: 12, textAlign: "center" }}>
                Try adjusting your search or filters.
              </AppText>
              <Pressable
                style={[styles.chip, styles.chipActive, { marginTop: 12 }]}
                onPress={() => { setQ(""); setCategory(""); setActiveChip(0); setTimeout(() => void load(), 50); }}
              >
                <AppText style={styles.chipTextActive}>Clear filters</AppText>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={
          canUpload ? (
            <Pressable style={styles.addListingBtn} onPress={() => void 0}>
              <AppText style={styles.addListingText}>+ Add a listing</AppText>
            </Pressable>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.lg,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 9, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: tokens.spacing.md,
    paddingTop: 9,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchInput: { flex: 1, fontSize: 11, color: "#333" },
  mapBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  mapBtnActive: { backgroundColor: "#005F6B" },
  mapBtnText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  mapNavBtn: {
    backgroundColor: "#E0F4F7",
    borderRadius: 9,
    padding: 7,
  },
  chipRow: {
    gap: 6,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 8,
  },
  chip: {
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipActive: { backgroundColor: PRIMARY },
  chipText: { fontSize: 10, fontWeight: "600", color: "#555" },
  chipTextActive: { color: "#fff" },
  mapBox: {
    height: 68,
    backgroundColor: "#E8F5E9",
    borderRadius: 9,
    marginHorizontal: tokens.spacing.md,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 0.5,
    borderColor: "#C8E6C9",
  },
  mapBoxText: { fontSize: 11, color: "#3A9E6F", fontWeight: "600" },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1A1A2E",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: 5,
  },
  resCard: {
    marginHorizontal: tokens.spacing.md,
    marginBottom: 7,
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#e4e4e4",
    borderRadius: 12,
    overflow: "hidden",
  },
  resImage: { width: "100%", height: 120 },
  resBody: { padding: 11 },
  resTopRow: { flexDirection: "row", alignItems: "flex-start" },
  resName: { fontSize: 13, fontWeight: "600", color: "#1A1A2E" },
  resType: { fontSize: 9, color: "#888", marginTop: 2 },
  stars: { fontSize: 11, color: "#F4861E" },
  resDesc: { fontSize: 10, color: "#888", marginTop: 4, lineHeight: 14 },
  snTag: {
    alignSelf: "flex-start",
    backgroundColor: "#E0F4F7",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 5,
  },
  snTagText: { fontSize: 8, fontWeight: "700", color: PRIMARY },
  resMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  resMetaText: { fontSize: 10 },
  uploadImgBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    paddingTop: 7,
    borderTopWidth: 0.5,
    borderTopColor: "#f0f0f0",
  },
  emptyState: { alignItems: "center", paddingTop: 40, paddingHorizontal: 24 },
  addListingBtn: {
    marginHorizontal: tokens.spacing.md,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: "#E0F4F7",
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: "center",
  },
  addListingText: { fontSize: 11, fontWeight: "700", color: PRIMARY },
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function uploadResourceImage(accessToken: string, uri: string): Promise<{ key: string; url: string }> {
  const form = new FormData();
  const name = uri.split("/").pop() || `resource-${Date.now()}.jpg`;
  const ext = name.split(".").pop()?.toLowerCase();
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  form.append("file", { uri, name, type } as any);
  const res = await fetch(`${getApiBaseUrl()}/upload/resource-image`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
    body: form,
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
      "EduWave will find support services within 50 km of you.",
      [
        { text: "Not now", style: "cancel", onPress: () => resolve(false) },
        { text: "Find nearby", onPress: () => resolve(true) },
      ]
    );
  });
}

function pickPlace(parts: Array<Location.LocationGeocodedAddress | null | undefined>): { city?: string; town?: string } {
  const first = parts.find((p) => p && typeof p === "object") as Location.LocationGeocodedAddress | undefined;
  const rawCity = (first?.city || first?.subregion || "").trim();
  const rawTown = (first?.district || first?.subregion || first?.name || "").trim();
  const city = rawCity.length ? rawCity : undefined;
  const town = rawTown.length && rawTown.toLowerCase() !== rawCity.toLowerCase() ? rawTown : undefined;
  return { city, town };
}

async function getCachedOrCurrentLocationAndPlace(): Promise<{
  coords: { latitude: number; longitude: number };
  place: { city?: string; town?: string };
}> {
  const cached = await getCachedLocation();
  if (cached) return cached;
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) throw new Error("Location permission denied");
  const loc = await Location.getCurrentPositionAsync({});
  const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  let place: { city?: string; town?: string } = {};
  try {
    const geo = await Location.reverseGeocodeAsync(coords);
    place = pickPlace([geo?.[0]]);
  } catch { /* optional */ }
  const value = { ...coords, ts: Date.now(), place };
  try { await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(value)); } catch { /* non-critical */ }
  return { coords, place };
}

async function getCachedLocation(): Promise<{
  coords: { latitude: number; longitude: number };
  place: { city?: string; town?: string };
} | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.latitude && parsed?.longitude && typeof parsed?.ts === "number") {
        const ageMs = Date.now() - parsed.ts;
        if (ageMs < 5 * 60 * 1000) {
          return {
            coords: { latitude: Number(parsed.latitude), longitude: Number(parsed.longitude) },
            place: typeof parsed?.place === "object" && parsed.place ? parsed.place : {},
          };
        }
      }
    }
  } catch { /* cache miss */ }
  return null;
}
