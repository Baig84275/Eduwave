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
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../api/client";
import { Resource, ResourceCategory } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ResourcesStackParamList } from "../navigation/stacks/ResourcesStack";
import { Card } from "../ui/Card";
import { TextField } from "../ui/TextField";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { getApiBaseUrl } from "../api/baseUrl";
import { AppText } from "../ui/Text";
import { InlineAlert } from "../ui/InlineAlert";
import { EmptyState } from "../ui/EmptyState";
import { AppButton } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Skeleton, SkeletonText, SkeletonImage } from "../ui/Skeleton";
import { tokens } from "../theme/tokens";
import { FadeInView, StaggeredItem } from "../animation/AnimatedComponents";
import { useToast } from "../ui/ToastProvider";
import { haptics } from "../animation";

type Props = NativeStackScreenProps<ResourcesStackParamList, "ResourceDirectory">;

const LOCATION_CACHE_KEY = "eduwave.location.last.v1";

const CATEGORIES: Array<{ value: ResourceCategory | ""; label: string; icon: string; color: string }> = [
  { value: "", label: "All", icon: "view-grid", color: "#64748B" },
  { value: "SCHOOL", label: "Schools", icon: "school", color: "#2563EB" },
  { value: "THERAPIST_SPECIALIST", label: "Therapists", icon: "heart-pulse", color: "#DB2777" },
  { value: "NGO", label: "NGOs", icon: "hand-heart", color: "#16A34A" },
  { value: "ORGANISATION", label: "Organisations", icon: "office-building", color: "#7C3AED" },
  { value: "SUPPORT_SERVICE", label: "Support", icon: "lifebuoy", color: "#F97316" },
];

export function ResourceDirectoryScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const canUpload =
    session?.user.role === "ORG_ADMIN" ||
    session?.user.role === "ADMIN" ||
    session?.user.role === "SUPER_ADMIN";

  const [resources, setResources] = useState<Resource[]>([]);
  const [q, setQ] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [town, setTown] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState<ResourceCategory | "">("");
  const [nearMe, setNearMe] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = useCallback(
    async (showLoading = true) => {
      if (!session) return;
      if (showLoading) setLoading(true);
      setError(null);
      try {
        if (nearMe) {
          const { coords, place } = await getCachedOrCurrentLocationAndPlace();
          if (!city.trim() && place.city) setCity(place.city);
          if (!town.trim() && place.town) setTown(place.town);
          const queryCity = city.trim() || place.city || "";
          const queryTown = town.trim() || place.town || "";
          const qs = new URLSearchParams();
          qs.set("lat", String(coords.latitude));
          qs.set("lng", String(coords.longitude));
          qs.set("radius", "50");
          if (category) qs.set("category", category);
          if (province.trim()) qs.set("province", province.trim());
          if (queryCity) qs.set("city", queryCity);
          if (queryTown) qs.set("town", queryTown);
          const res = await api.get<{ resources: Resource[] }>(
            `/resources/nearby?${qs.toString()}`,
            session
          );
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
          setError(msg);
          toast.error("Error", msg);
        }
      } finally {
        setLoading(false);
      }
    },
    [category, city, nearMe, province, q, session, tags, toast, town]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleNearMeToggle = async () => {
    haptics.light();
    setError(null);
    if (!nearMe) {
      const ok = await confirmLocationUse();
      if (!ok) return;
    }
    setNearMe((prev) => !prev);
    setTimeout(() => void load(), 50);
  };

  const handleCategorySelect = (value: ResourceCategory | "") => {
    haptics.selection();
    setCategory(value);
  };

  // ─── Header ──────────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Gradient hero */}
      <FadeInView delay={0}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderRadius: tokens.radius.xl }]}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="map-marker-multiple" size={28} color="rgba(255,255,255,0.9)" />
            </View>
            <View style={styles.heroText}>
              <AppText variant="h2" weight="bold" style={{ color: "#FFFFFF" }}>
                Resources
              </AppText>
              <AppText variant="caption" style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
                Support services, schools & specialists
              </AppText>
            </View>
            <View style={styles.heroActions}>
              <Pressable
                onPress={() => navigation.navigate("ResourcesMap")}
                style={styles.mapIconBtn}
                accessibilityLabel="Open map view"
              >
                <MaterialCommunityIcons name="map" size={22} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <AppText variant="h3" weight="bold" style={{ color: "#FFFFFF" }}>
                {loading ? "—" : resources.length}
              </AppText>
              <AppText variant="caption" style={{ color: "rgba(255,255,255,0.7)" }}>
                Results
              </AppText>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <AppText variant="h3" weight="bold" style={{ color: "#FFFFFF" }}>
                {CATEGORIES.length - 1}
              </AppText>
              <AppText variant="caption" style={{ color: "rgba(255,255,255,0.7)" }}>
                Categories
              </AppText>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <AppText variant="h3" weight="bold" style={{ color: "#FFFFFF" }}>
                50km
              </AppText>
              <AppText variant="caption" style={{ color: "rgba(255,255,255,0.7)" }}>
                Near me radius
              </AppText>
            </View>
          </View>
        </LinearGradient>
      </FadeInView>

      {/* Search + near-me row */}
      <FadeInView delay={60}>
        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <TextField
              label="Search"
              value={q}
              onChangeText={setQ}
              placeholder="Name, description, city…"
              leftIcon={
                <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
              }
              onSubmitEditing={() => void load()}
              returnKeyType="search"
            />
          </View>
          <Pressable
            onPress={handleNearMeToggle}
            style={[
              styles.nearMeChip,
              {
                backgroundColor: nearMe ? colors.primary : colors.surfaceAlt,
                borderColor: nearMe ? colors.primary : colors.border,
              },
            ]}
            accessibilityLabel={nearMe ? "Near me: on" : "Find near me"}
          >
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={18}
              color={nearMe ? "#FFFFFF" : colors.textMuted}
            />
            <AppText
              variant="caption"
              weight="semibold"
              style={{ color: nearMe ? "#FFFFFF" : colors.textMuted, marginLeft: 4 }}
            >
              {nearMe ? "Near me" : "Near me"}
            </AppText>
          </Pressable>
        </View>
      </FadeInView>

      {/* Category chips */}
      <FadeInView delay={100}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => {
            const selected = category === cat.value;
            return (
              <Pressable
                key={cat.value === "" ? "all" : cat.value}
                onPress={() => handleCategorySelect(cat.value as ResourceCategory | "")}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selected ? cat.color : colors.surface,
                    borderColor: selected ? cat.color : colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={cat.label}
                accessibilityState={{ selected }}
              >
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={14}
                  color={selected ? "#FFFFFF" : cat.color}
                />
                <AppText
                  variant="caption"
                  weight="semibold"
                  style={{
                    color: selected ? "#FFFFFF" : colors.text,
                    marginLeft: 5,
                  }}
                >
                  {cat.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </FadeInView>

      {/* Collapsible filters */}
      <FadeInView delay={140}>
        <Pressable
          onPress={() => {
            haptics.light();
            setFiltersOpen((o) => !o);
          }}
          style={[styles.filtersToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={filtersOpen ? "Hide filters" : "Show location filters"}
        >
          <MaterialCommunityIcons
            name="tune-variant"
            size={18}
            color={filtersOpen ? colors.primary : colors.textMuted}
          />
          <AppText
            variant="label"
            weight="semibold"
            style={{ color: filtersOpen ? colors.primary : colors.text, marginLeft: 8 }}
          >
            Location filters
          </AppText>
          {(province || city || town || tags) ? (
            <Badge label="Active" color="primary" variant="subtle" size="sm" style={{ marginLeft: 8 }} />
          ) : null}
          <MaterialCommunityIcons
            name={filtersOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textMuted}
            style={{ marginLeft: "auto" }}
          />
        </Pressable>

        {filtersOpen && (
          <View style={[styles.filtersPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.filterRow}>
              <View style={styles.filterField}>
                <TextField
                  label="Province"
                  value={province}
                  onChangeText={setProvince}
                  placeholder="e.g., Gauteng"
                />
              </View>
              <View style={styles.filterField}>
                <TextField
                  label="City"
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g., Johannesburg"
                />
              </View>
            </View>
            <View style={styles.filterRow}>
              <View style={styles.filterField}>
                <TextField
                  label="Town / Area"
                  value={town}
                  onChangeText={setTown}
                  placeholder="e.g., Sandton"
                />
              </View>
              <View style={styles.filterField}>
                <TextField
                  label="Tags"
                  value={tags}
                  onChangeText={setTags}
                  placeholder="Autism, ADHD"
                />
              </View>
            </View>
            <View style={styles.filterActions}>
              <View style={{ flex: 1 }}>
                <AppButton
                  title="Apply filters"
                  variant="primary"
                  size="md"
                  loading={loading}
                  fullWidth
                  onPress={() => void load()}
                />
              </View>
              <AppButton
                title="Clear"
                variant="ghost"
                size="md"
                onPress={() => {
                  haptics.light();
                  setProvince("");
                  setCity("");
                  setTown("");
                  setTags("");
                }}
              />
            </View>
          </View>
        )}
      </FadeInView>

      {error && (
        <FadeInView delay={0}>
          <InlineAlert tone="danger" text={error} />
        </FadeInView>
      )}

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <AppText variant="h3" weight="bold">
          {nearMe ? "Nearby resources" : "All resources"}
        </AppText>
        {!loading && (
          <Badge
            label={`${resources.length} found`}
            color={resources.length > 0 ? "primary" : "neutral"}
            variant="subtle"
            size="sm"
          />
        )}
      </View>
    </View>
  );

  // ─── Skeleton list ────────────────────────────────────────────────────────────
  const renderSkeleton = () => (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[styles.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <SkeletonImage height={140} />
          <View style={styles.skeletonBody}>
            <Skeleton width="65%" height={18} />
            <Skeleton width="45%" height={13} style={{ marginTop: 8 }} />
            <View style={{ marginTop: 12 }}>
              <SkeletonText lines={2} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  // ─── Resource card ────────────────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: Resource; index: number }) => {
    const catInfo = CATEGORIES.find((c) => c.value === item.category) ?? CATEGORIES[CATEGORIES.length - 1];

    return (
      <StaggeredItem index={index} staggerDelay={40}>
        <Card variant="elevated" style={styles.resourceCard}>
          {/* Category accent strip */}
          <View style={[styles.categoryStrip, { backgroundColor: catInfo.color }]} />

          {/* Image or placeholder */}
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.resourceImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.resourceImagePlaceholder, { backgroundColor: `${catInfo.color}15` }]}>
              <MaterialCommunityIcons name={catInfo.icon as any} size={40} color={catInfo.color} />
              <AppText variant="caption" weight="bold" style={{ color: catInfo.color, marginTop: 6 }}>
                {catInfo.label}
              </AppText>
            </View>
          )}

          <View style={styles.cardBody}>
            {/* Title row */}
            <View style={styles.cardTitleRow}>
              <AppText variant="body" weight="bold" style={styles.cardName}>
                {item.name}
              </AppText>
              <View style={styles.cardBadges}>
                <Badge
                  label={catInfo.label}
                  color="neutral"
                  variant="subtle"
                  size="sm"
                />
                {typeof item.distanceKm === "number" && (
                  <Badge
                    label={`${item.distanceKm.toFixed(1)} km`}
                    color="info"
                    variant="subtle"
                    size="sm"
                    icon={<MaterialCommunityIcons name="crosshairs-gps" size={10} color="inherit" />}
                  />
                )}
              </View>
            </View>

            {/* Location */}
            <View style={styles.cardMeta}>
              <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.textMuted} />
              <AppText variant="caption" tone="muted" style={styles.cardMetaText}>
                {[item.town, item.city, item.province].filter(Boolean).join(", ")}
              </AppText>
            </View>

            {/* Address */}
            {item.address ? (
              <View style={styles.cardMeta}>
                <MaterialCommunityIcons name="home-outline" size={13} color={colors.textMuted} />
                <AppText variant="caption" tone="muted" style={styles.cardMetaText}>
                  {item.address}
                </AppText>
              </View>
            ) : null}

            {/* Description */}
            {item.description ? (
              <AppText
                variant="body"
                style={[styles.cardDescription, { color: colors.textMuted }]}
                numberOfLines={3}
              >
                {item.description}
              </AppText>
            ) : null}

            {/* Contact */}
            {item.contactInfo ? (
              <View style={styles.cardMeta}>
                <MaterialCommunityIcons name="phone-outline" size={13} color={colors.primary} />
                <AppText
                  variant="caption"
                  weight="semibold"
                  style={[styles.cardMetaText, { color: colors.primary }]}
                >
                  {item.contactInfo}
                </AppText>
              </View>
            ) : null}

            {/* Tags */}
            {item.tags?.length > 0 && (
              <View style={styles.tagsRow}>
                {item.tags.slice(0, 4).map((tag) => (
                  <Badge
                    key={tag}
                    label={tag}
                    color="neutral"
                    variant="outline"
                    size="sm"
                  />
                ))}
                {item.tags.length > 4 && (
                  <Badge
                    label={`+${item.tags.length - 4}`}
                    color="neutral"
                    variant="subtle"
                    size="sm"
                  />
                )}
              </View>
            )}

            {/* Admin: upload image */}
            {canUpload && (
              <View style={styles.adminActions}>
                <AppButton
                  title={uploadingId === item.id ? "Uploading…" : "Upload image"}
                  variant="ghost"
                  size="sm"
                  loading={uploadingId === item.id}
                  disabled={uploadingId === item.id}
                  icon={
                    <MaterialCommunityIcons name="camera-plus-outline" size={16} color={colors.primary} />
                  }
                  onPress={async () => {
                    if (!session) return;
                    setUploadingId(item.id);
                    try {
                      const picked = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ["images"],
                        quality: 0.85,
                      });
                      if (picked.canceled || !picked.assets?.length) return;
                      const asset = picked.assets[0];
                      const { key } = await uploadResourceImage(session.accessToken, asset.uri);
                      await api.patch<{ resource: Resource }>(
                        `/resources/${item.id}`,
                        { imageUrl: key },
                        session
                      );
                      toast.success("Image uploaded", `Photo updated for ${item.name}`);
                      void load(false);
                    } catch (e: any) {
                      toast.error("Upload failed", e?.message ?? "Could not upload image");
                    } finally {
                      setUploadingId(null);
                    }
                  }}
                />
              </View>
            )}
          </View>
        </Card>
      </StaggeredItem>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={loading ? [] : resources}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          loading ? renderSkeleton() : (
            <FadeInView delay={100}>
              <EmptyState
                title="No resources found"
                message={
                  nearMe
                    ? "No resources found within 50 km. Try broadening your search."
                    : "Try adjusting filters or clearing the search."
                }
                action={
                  <AppButton
                    title="Clear all filters"
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      setQ("");
                      setProvince("");
                      setCity("");
                      setTown("");
                      setTags("");
                      setCategory("");
                      setNearMe(false);
                      setTimeout(() => void load(), 50);
                    }}
                  />
                }
              />
            </FadeInView>
          )
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + tokens.spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        ListFooterComponent={
          <View style={{ height: tokens.components.tabBar.height + insets.bottom + tokens.spacing.lg }} />
        }
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  headerContainer: {
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },

  // Hero card
  heroCard: {
    padding: tokens.spacing.xl,
    overflow: "hidden",
    gap: tokens.spacing.lg,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: { flex: 1 },
  heroActions: { alignItems: "flex-end" },
  mapIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  // Search row
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  searchInput: { flex: 1 },
  nearMeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm + 2,
    borderRadius: tokens.radius.full,
    borderWidth: 1.5,
    gap: 4,
  },

  // Category chips
  categoryRow: {
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
    borderWidth: 1.5,
  },

  // Filters
  filtersToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
  },
  filtersPanel: {
    marginTop: tokens.spacing.xs,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
  },
  filterField: { flex: 1 },
  filterActions: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
    alignItems: "center",
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: tokens.spacing.xs,
  },

  // Skeleton
  skeletonList: {
    gap: tokens.spacing.md,
  },
  skeletonCard: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  skeletonBody: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },

  // Resource card
  resourceCard: {
    overflow: "hidden",
    padding: 0,
  },
  categoryStrip: {
    height: 4,
    width: "100%",
  },
  resourceImage: {
    width: "100%",
    height: 160,
  },
  resourceImagePlaceholder: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cardBody: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.spacing.sm,
  },
  cardName: {
    flex: 1,
    lineHeight: 22,
  },
  cardBadges: {
    flexDirection: "column",
    gap: tokens.spacing.xs,
    alignItems: "flex-end",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  cardMetaText: {
    flex: 1,
  },
  cardDescription: {
    lineHeight: 20,
    marginTop: tokens.spacing.xs,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.xs,
  },
  adminActions: {
    marginTop: tokens.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: tokens.spacing.sm,
    alignItems: "flex-start",
  },
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function uploadResourceImage(
  accessToken: string,
  uri: string
): Promise<{ key: string; url: string }> {
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
      "EduWave will find support services within 50 km of you. Your location is only used for this search.",
      [
        { text: "Not now", style: "cancel", onPress: () => resolve(false) },
        { text: "Find nearby", onPress: () => resolve(true) },
      ]
    );
  });
}

function pickPlace(
  parts: Array<Location.LocationGeocodedAddress | null | undefined>
): { city?: string; town?: string } {
  const first = parts.find((p) => p && typeof p === "object") as
    | Location.LocationGeocodedAddress
    | undefined;
  const rawCity = (first?.city || first?.subregion || "").trim();
  const rawTown = (first?.district || first?.subregion || first?.name || "").trim();
  const city = rawCity.length ? rawCity : undefined;
  const town =
    rawTown.length && rawTown.toLowerCase() !== rawCity.toLowerCase() ? rawTown : undefined;
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
  } catch {
    // reverse geocode is optional
  }

  const value = { ...coords, ts: Date.now(), place };
  try {
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(value));
  } catch {
    // storage failure is non-critical
  }
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
          const coords = {
            latitude: Number(parsed.latitude),
            longitude: Number(parsed.longitude),
          };
          const place =
            typeof parsed?.place === "object" && parsed.place ? parsed.place : {};
          return { coords, place };
        }
      }
    }
  } catch {
    // cache miss
  }
  return null;
}
