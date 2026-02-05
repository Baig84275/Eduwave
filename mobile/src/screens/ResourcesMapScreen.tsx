import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Linking, NativeModules, Platform, View } from "react-native";
import { api } from "../api/client";
import { Resource } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";
import { AppText } from "../ui/Text";

type Props = NativeStackScreenProps<MainStackParamList, "ResourcesMap">;

const LOCATION_CACHE_KEY = "eduwave.location.last.v1";

// Map view is intentionally simple: markers + minimal filtering, aligned with "find nearby help"
// without adding complex navigation or behavioral tracking.
export function ResourcesMapScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState({
    latitude: -26.2041,
    longitude: 28.0473,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25
  });

  const mapsAvailable = Boolean((NativeModules as any)?.RNMapsAirModule);

  const coordinateResources = useMemo(
    () => resources.filter((r) => typeof r.latitude === "number" && typeof r.longitude === "number"),
    [resources]
  );

  const loadNearMe = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const ok = await confirmLocationUse();
      if (!ok) {
        setLoading(false);
        return;
      }
      const coords = await getCachedOrCurrentLocation();
      const res = await api.get<{ resources: Resource[] }>(
        `/resources/nearby?lat=${coords.latitude}&lng=${coords.longitude}&radius=50`,
        session
      );
      setResources(res.resources);
      setRegion({ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.25, longitudeDelta: 0.25 });
    } catch (e: any) {
      setError(e?.message ?? "Failed to load nearby resources");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadNearMe();
  }, [loadNearMe]);

  const MapViewModule = useMemo(() => {
    if (!mapsAvailable) return null;
    try {
      return require("react-native-maps");
    } catch {
      return null;
    }
  }, [mapsAvailable]);

  const MapView = MapViewModule?.default ?? null;
  const Marker = MapViewModule?.Marker ?? null;
  const Callout = MapViewModule?.Callout ?? null;

  const pinColorForCategory = useCallback((category: Resource["category"]) => {
    if (category === "SCHOOL") return "#2563EB";
    if (category === "THERAPIST_SPECIALIST") return "#DB2777";
    if (category === "NGO") return "#16A34A";
    if (category === "SUPPORT_SERVICE") return "#F97316";
    return "#64748B";
  }, []);

  const openNativeMaps = useCallback((r: Resource) => {
    if (typeof r.latitude !== "number" || typeof r.longitude !== "number") return;
    const label = encodeURIComponent(r.name);
    const latLng = `${r.latitude},${r.longitude}`;
    const url =
      Platform.OS === "ios" ? `maps:0,0?q=${label}@${latLng}` : `geo:0,0?q=${latLng}(${label})`;
    void Linking.openURL(url);
  }, []);

  return (
    <ScrollScreen>
      <View style={{ gap: 16 }}>
        <ScreenHeader title="Resources map" subtitle="Shows nearby resources within 50 km of your location." />

        {error ? <InlineAlert tone="danger" text={error} /> : null}

        <Card style={{ padding: 0, overflow: "hidden", minHeight: 200 }}>
          {MapView && Marker ? (
            <MapView style={{ height: 400, width: "100%" }} region={region} onRegionChangeComplete={setRegion}>
              {coordinateResources.map((r) => (
                <Marker
                  key={r.id}
                  coordinate={{ latitude: r.latitude as number, longitude: r.longitude as number }}
                  title={r.name}
                  description={`${r.distanceKm?.toFixed?.(1) ?? r.distance?.toFixed?.(1) ?? "?"} km · ${r.city}, ${r.province}`}
                  pinColor={pinColorForCategory(r.category)}
                >
                  {Callout ? (
                    <Callout onPress={() => openNativeMaps(r)}>
                      <View style={{ maxWidth: 220, paddingVertical: 6, gap: 4 }}>
                        <AppText variant="label" weight="black">{r.name}</AppText>
                        <AppText variant="caption" tone="muted">
                          {(typeof r.distanceKm === "number" ? r.distanceKm : r.distance)?.toFixed?.(1) ?? "?"} km · {r.category}
                        </AppText>
                        <AppText variant="caption" weight="bold" style={{ color: colors.primary }}>Navigate to</AppText>
                      </View>
                    </Callout>
                  ) : null}
                </Marker>
              ))}
            </MapView>
          ) : (
            <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
              <AppText variant="h3" style={{ marginBottom: 8 }}>Map not available</AppText>
              <AppText variant="body" tone="muted" style={{ textAlign: 'center' }}>
                This screen uses native maps, which requires a custom build. The list view will still work.
              </AppText>
            </View>
          )}
        </Card>

        <Card style={{ backgroundColor: colors.surfaceAlt }}>
          <AppText variant="caption" tone="muted">
            Showing {coordinateResources.length} resources with coordinates (out of {resources.length}).
          </AppText>
        </Card>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <AppButton title={loading ? "Loading..." : "Refresh"} variant="secondary" onPress={() => void loadNearMe()} />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        </View>
      </View>
    </ScrollScreen>
  );
}

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
