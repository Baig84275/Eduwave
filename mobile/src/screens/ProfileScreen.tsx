import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "../ui/Text";
import { Card } from "../ui/Card";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { ListItem, ListItemSeparator, ListSectionHeader, NavigationListItem } from "../ui/ListItem";
import { AppButton } from "../ui/Button";
import { Divider } from "../ui/Divider";
import { tokens } from "../theme/tokens";
import { FadeInView, SlideInView } from "../animation/AnimatedComponents";
import { ProfileStackParamList } from "../navigation/stacks/ProfileStack";

type ProfileNavigation = NativeStackNavigationProp<ProfileStackParamList>;

export function ProfileScreen() {
  const { session, logout } = useAuth();
  const { config, mode } = useAccessibility();
  const colors = config.color.colors;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ProfileNavigation>();

  const user = session?.user;
  const userRole = user?.role || "PARENT";

  // Role display names
  const roleDisplayNames: Record<string, string> = {
    PARENT: "Parent",
    FACILITATOR: "Facilitator",
    TEACHER: "Teacher",
    THERAPIST: "Therapist",
    TRAINER_SUPERVISOR: "Trainer/Supervisor",
    ORG_ADMIN: "Organization Admin",
    ADMIN: "Administrator",
    SUPER_ADMIN: "Super Admin",
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + tokens.spacing.lg },
      ]}
    >
      {/* Profile Header */}
      <FadeInView delay={0}>
        <Card variant="glass" elevation="lg" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar
              name={user?.email || "User"}
              size="xl"
              showGradientBorder
            />
            <View style={styles.profileInfo}>
              <AppText variant="h3" weight="bold">
                {user?.email?.split("@")[0] || "User"}
              </AppText>
              <AppText variant="body" tone="muted" style={{ marginTop: 4 }}>
                {user?.email}
              </AppText>
              <Badge
                label={roleDisplayNames[userRole] || userRole}
                color="primary"
                variant="subtle"
                style={{ marginTop: tokens.spacing.sm }}
              />
            </View>
          </View>
        </Card>
      </FadeInView>

      {/* Quick Actions */}
      <SlideInView direction="up" delay={100}>
        <View style={styles.section}>
          <ListSectionHeader title="Quick Actions" />
          <Card>
            {userRole === "FACILITATOR" && (
              <>
                <NavigationListItem
                  title="Daily Check-In"
                  subtitle="Log your daily reflection"
                  icon="clipboard-check-outline"
                  onPress={() => navigation.navigate("CheckIn")}
                />
                <ListItemSeparator inset />
                <NavigationListItem
                  title="My Journey"
                  subtitle="View your progress and growth"
                  icon="chart-line"
                  onPress={() => navigation.navigate("Journey")}
                />
                <ListItemSeparator inset />
              </>
            )}

            {["TRAINER_SUPERVISOR", "ORG_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(userRole) && (
              <>
                <NavigationListItem
                  title="Supervision Logs"
                  subtitle="Manage facilitator supervision"
                  icon="clipboard-text-outline"
                  onPress={() => navigation.navigate("SupervisionLogs")}
                />
                <ListItemSeparator inset />
              </>
            )}

            <NavigationListItem
              title="Invitations"
              subtitle="Manage your professional connections"
              icon="account-plus-outline"
              onPress={() => navigation.navigate("Invitations")}
            />
          </Card>
        </View>
      </SlideInView>

      {/* Settings */}
      <SlideInView direction="up" delay={200}>
        <View style={styles.section}>
          <ListSectionHeader title="Settings" />
          <Card>
            <NavigationListItem
              title="Accessibility"
              subtitle={`Current mode: ${mode}`}
              icon="eye-settings-outline"
              onPress={() => navigation.navigate("Accessibility")}
            />
            {["ADMIN", "SUPER_ADMIN"].includes(userRole) && (
              <>
                <ListItemSeparator inset />
                <NavigationListItem
                  title="Admin Dashboard"
                  subtitle="Manage users and settings"
                  icon="shield-account-outline"
                  onPress={() => navigation.navigate("Admin")}
                />
              </>
            )}
          </Card>
        </View>
      </SlideInView>

      {/* App Info */}
      <SlideInView direction="up" delay={300}>
        <View style={styles.section}>
          <ListSectionHeader title="About" />
          <Card>
            <ListItem
              title="Version"
              rightContent={
                <AppText variant="body" tone="muted">
                  1.0.0
                </AppText>
              }
            />
            <ListItemSeparator inset />
            <ListItem
              title="EduWave Village"
              subtitle="Supporting child development together"
              leftContent={
                <View style={[styles.appIcon, { backgroundColor: colors.primary }]}>
                  <MaterialCommunityIcons name="heart" size={20} color="#FFFFFF" />
                </View>
              }
            />
          </Card>
        </View>
      </SlideInView>

      {/* Logout */}
      <SlideInView direction="up" delay={400}>
        <View style={styles.section}>
          <AppButton
            title="Sign Out"
            variant="danger"
            onPress={handleLogout}
            fullWidth
            icon={<MaterialCommunityIcons name="logout" size={20} color="#FFFFFF" />}
          />
        </View>
      </SlideInView>

      {/* Bottom spacing for tab bar */}
      <View style={{ height: tokens.components.tabBar.height + insets.bottom + tokens.spacing.lg }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.lg,
  },
  profileCard: {
    padding: tokens.spacing.xl,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  section: {
    gap: tokens.spacing.sm,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
