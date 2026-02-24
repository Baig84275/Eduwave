import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import { FlatList, View, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { api } from "../api/client";
import { Child } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { HomeStackParamList } from "../navigation/stacks/HomeStack";
import { AppButton, IconButton } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { AppText } from "../ui/Text";
import { InlineAlert } from "../ui/InlineAlert";
import { EmptyState } from "../ui/EmptyState";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { SkeletonCard } from "../ui/Skeleton";
import { tokens } from "../theme/tokens";
import { FadeInView, SlideInView, StaggeredItem } from "../animation/AnimatedComponents";
import { useToast } from "../ui/ToastProvider";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export function ChildListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isParent = session?.user.role === "PARENT";

  const fetchChildren = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        const res = await api.get<{ children: Child[] }>("/children", session);
        setChildren(res.children);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load children");
        toast.error("Error", e?.message ?? "Failed to load children");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session, toast]
  );

  useFocusEffect(
    useCallback(() => {
      fetchChildren();
    }, [fetchChildren])
  );

  const handleRefresh = () => fetchChildren(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Welcome Card with Gradient */}
      <FadeInView delay={0}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.welcomeCard, { borderRadius: tokens.radius.xl }]}
        >
          <View style={styles.welcomeContent}>
            <View style={styles.welcomeText}>
              <AppText variant="body" style={{ color: "rgba(255,255,255,0.8)" }}>
                {getGreeting()}
              </AppText>
              <AppText variant="h2" weight="bold" style={{ color: "#FFFFFF", marginTop: 4 }}>
                {session?.user.email?.split("@")[0] || "User"}
              </AppText>
              <AppText variant="caption" style={{ color: "rgba(255,255,255,0.7)", marginTop: 8 }}>
                {isParent
                  ? `${children.length} child profile${children.length !== 1 ? "s" : ""}`
                  : `${children.length} assigned child${children.length !== 1 ? "ren" : ""}`}
              </AppText>
            </View>
            <Avatar
              name={session?.user.email || "User"}
              size="lg"
              showGradientBorder={false}
            />
          </View>
        </LinearGradient>
      </FadeInView>

      {/* Quick Actions */}
      {isParent && (
        <SlideInView direction="up" delay={100}>
          <AppButton
            title="Add Child Profile"
            variant="primary"
            size="lg"
            fullWidth
            icon={<MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />}
            onPress={() => navigation.navigate("CreateChild")}
          />
        </SlideInView>
      )}

      {/* Section Header */}
      <SlideInView direction="up" delay={150}>
        <View style={styles.sectionHeader}>
          <AppText variant="h3" weight="bold">
            {isParent ? "My Children" : "Assigned Children"}
          </AppText>
          <Badge
            label={`${children.length}`}
            color="primary"
            variant="subtle"
            size="sm"
          />
        </View>
      </SlideInView>

      {error && (
        <SlideInView direction="up" delay={200}>
          <InlineAlert tone="danger" text={error} />
        </SlideInView>
      )}
    </View>
  );

  const renderChild = ({ item, index }: { item: Child; index: number }) => {
    const age = Math.floor(
      (Date.now() - new Date(item.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    return (
      <StaggeredItem index={index} staggerDelay={50}>
        <Card
          variant="elevated"
          pressable
          onPress={() => navigation.navigate("Child", { childId: item.id })}
          style={styles.childCard}
        >
          <View style={styles.childCardContent}>
            <Avatar name={item.name} size="lg" />
            <View style={styles.childInfo}>
              <AppText variant="body" weight="semibold">
                {item.name}
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {age} years old
              </AppText>
              <View style={styles.childMeta}>
                <Badge
                  label={new Date(item.dateOfBirth).toLocaleDateString()}
                  color="neutral"
                  variant="subtle"
                  size="sm"
                />
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={colors.textMuted}
            />
          </View>
        </Card>
      </StaggeredItem>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.skeletonContainer}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      );
    }

    return (
      <FadeInView delay={200}>
        <EmptyState
          title={isParent ? "No children yet" : "No assignments"}
          message={
            isParent
              ? "Create your first child profile to start tracking their progress and connecting with facilitators."
              : "You haven't been assigned to any children yet. Contact your supervisor for assignments."
          }
          action={
            isParent ? (
              <AppButton
                title="Create Child Profile"
                variant="primary"
                onPress={() => navigation.navigate("CreateChild")}
                icon={<MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />}
              />
            ) : undefined
          }
        />
      </FadeInView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={children}
        keyExtractor={(item) => item.id}
        renderItem={renderChild}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + tokens.spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListFooterComponent={
          <View style={{ height: tokens.components.tabBar.height + insets.bottom + tokens.spacing.lg }} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  headerContainer: {
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  welcomeCard: {
    padding: tokens.spacing.xl,
    overflow: "hidden",
  },
  welcomeContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  welcomeText: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: tokens.spacing.sm,
  },
  childCard: {
    marginBottom: tokens.spacing.xs,
  },
  childCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  childInfo: {
    flex: 1,
  },
  childMeta: {
    flexDirection: "row",
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.xs,
  },
  skeletonContainer: {
    gap: tokens.spacing.md,
  },
});
