import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Dimensions, Linking, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { api } from "../api/client";
import { Resource } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ResourcesStackParamList } from "../navigation/stacks/ResourcesStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";
import { AppText } from "../ui/Text";
import { TextField } from "../ui/TextField";

type Props = NativeStackScreenProps<ResourcesStackParamList, "ResourcesMap">;

const LOCATION_CACHE_KEY = "eduwave.location.last.v1";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_HEIGHT = Math.round(SCREEN_WIDTH * 0.85); // ~85vw square-ish

const CATEGORY_COLORS: Record<string, string> = {
  SCHOOL: "#2563EB",
  THERAPIST_SPECIALIST: "#DB2777",
  NGO: "#16A34A",
  SUPPORT_SERVICE: "#F97316",
  OTHER: "#64748B"
};

export function ResourcesMapScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState("");
  const [town, setTown] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [region, setRegion] = useState({
    latitude: -26.2041,
    longitude: 28.0473,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25
  });

  const coordinateResources = useMemo(
    () => resources.filter((r) => typeof r.latitude === "number" && typeof r.longitude === "number"),
    [resources]
  );

  const selectedResource = useMemo(
    () => coordinateResources.find((r) => r.id === selectedId) ?? null,
    [coordinateResources, selectedId]
  );

  const loadNearMe = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const ok = await confirmLocationUse();
      if (!ok) { setLoading(false); return; }
      const { coords, place } = await getCachedOrCurrentLocationAndPlace();
      if (!city.trim() && place.city) setCity(place.city);
      if (!town.trim() && place.town) setTown(place.town);
      const queryCity = city.trim() || place.city || "";
      const queryTown = town.trim() || place.town || "";
      const qs = new URLSearchParams();
      qs.set("lat", String(coords.latitude));
      qs.set("lng", String(coords.longitude));
      qs.set("radius", "50");
      if (queryCity) qs.set("city", queryCity);
      if (queryTown) qs.set("town", queryTown);
      const res = await api.get<{ resources: Resource[] }>(`/resources/nearby?${qs.toString()}`, session);
      setResources(res.resources);
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to load nearby resources");
    } finally {
      setLoading(false);
    }
  }, [city, session, town]);

  useEffect(() => { void loadNearMe(); }, [loadNearMe]);

  const pinColor = useCallback(
    (category: Resource["category"]) => CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTHER,
    []
  );

  const openNativeMaps = useCallback((r: Resource) => {
    if (typeof r.latitude !== "number" || typeof r.longitude !== "number") return;
    const label = encodeURIComponent(r.name);
    const latLng = `${r.latitude},${r.longitude}`;
    const url =
      Platform.OS === "ios"
        ? `maps:0,0?q=${label}@${latLng}`
        : `geo:0,0?q=${latLng}(${label})`;
    void Linking.openURL(url);
  }, []);

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }]}>
      {/* Fixed map — takes up most of the screen */}
      <View style={[styles.mapContainer, { borderColor: colors.border }]}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation
          showsMyLocationButton
          showsCompass
          toolbarEnabled={false}
        >
          {coordinateResources.map((r) => (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.latitude as number, longitude: r.longitude as number }}
              title={r.name}
              description={`${(r.distanceKm ?? r.distance)?.toFixed?.(1) ?? "?"} km · ${r.city}`}
              pinColor={pinColor(r.category)}
              onPress={() => setSelectedId(r.id)}
            >
              <Callout onPress={() => openNativeMaps(r)} tooltip={false}>
                <View style={styles.callout}>
                  <AppText variant="label" weight="black" style={{ flexShrink: 1 }}>
                    {r.name}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {(r.distanceKm ?? r.distance)?.toFixed?.(1) ?? "?"} km · {r.category.replace(/_/g, " ")}
                  </AppText>
                  <AppText variant="caption" weight="semibold" style={{ color: colors.primary }}>
                    Tap to navigate
                  </AppText>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>

        {/* Legend overlay */}
        <View style={[styles.legend, { backgroundColor: colors.surface + "EE" }]}>
          <AppText variant="caption" weight="semibold" tone="muted">
            {loading ? "Loading..." : `${coordinateResources.length} of ${resources.length} mapped`}
          </AppText>
        </View>
      </View>

      {/* Bottom panel */}
      <View style={[styles.panel, { backgroundColor: colors.surface }]}>
        <ScreenHeader
          title="Resources map"
          subtitle="50 km radius · tap a pin to see details"
          style={{ marginBottom: 8 }}
        />

        {error ? <InlineAlert tone="danger" text={error} /> : null}

        {/* Selected resource card */}
        {selectedResource ? (
          <Card style={{ backgroundColor: colors.surfaceAlt, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <View
                style={{
                  width: 10,
                  alignSelf: "stretch",
                  borderRadius: 4,
                  backgroundColor: pinColor(selectedResource.category)
                }}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="label" weight="black">{selectedResource.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {selectedResource.category.replace(/_/g, " ")} ·{" "}
                  {(selectedResource.distanceKm ?? selectedResource.distance)?.toFixed?.(1) ?? "?"} km
                </AppText>
                {selectedResource.address ? (
                  <AppText variant="caption" tone="muted">{selectedResource.address}</AppText>
                ) : null}
              </View>
              <AppButton
                title="Go"
                variant="primary"
                size="sm"
                onPress={() => openNativeMaps(selectedResource)}
              />
            </View>
          </Card>
        ) : null}

        {/* Filters + refresh */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField label="City" value={city} onChangeText={setCity} placeholder="Filter by city" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Town" value={town} onChangeText={setTown} placeholder="Filter by town" />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <AppButton
              title={loading ? "Loading..." : "Refresh"}
              variant="secondary"
              loading={loading}
              disabled={loading}
              onPress={() => void loadNearMe()}
              fullWidth
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton title="Back" variant="ghost" onPress={() => navigation.goBack()} fullWidth />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    minHeight: MAP_HEIGHT,
    borderBottomWidth: 1,
    overflow: "hidden"
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  legend: {
    position: "absolute",
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20
  },
  callout: {
    width: 200,
    padding: 8,
    gap: 2
  },
  panel: {
    padding: 16,
    gap: 4
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function confirmLocationUse(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "Use your location?",
      "EduWave can use your location to show nearby support services. Your location is only used for this search.",
      [
        { text: "Not now", style: "cancel", onPress: () => resolve(false) },
        { text: "Continue", onPress: () => resolve(true) }
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
  } catch { void 0; }

  const value = { ...coords, ts: Date.now(), place };
  try {
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(value));
  } catch { void 0; }
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
        if (Date.now() - parsed.ts < 5 * 60 * 1000) {
          const coords = { latitude: Number(parsed.latitude), longitude: Number(parsed.longitude) };
          const place = typeof parsed?.place === "object" && parsed.place ? parsed.place : {};
          return { coords, place };
        }
      }
    }
  } catch { void 0; }
  return null;
}
