import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "../ui/Text";
import { tokens } from "../theme/tokens";

const SOS_RED = "#D32F2F";
const SOS_DARK = "#B71C1C";

interface EmergencyContact {
  name: string;
  number: string;
  type: string;
  icon: string;
  color: string;
  bg: string;
}

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { name: "Emergency Services", number: "112", type: "Police / Ambulance / Fire", icon: "ambulance", color: SOS_RED, bg: "#FFEBEE" },
  { name: "SAPS Police", number: "10111", type: "South African Police Service", icon: "shield-outline", color: "#1565C0", bg: "#E3F2FD" },
  { name: "Childline SA", number: "0800 055 555", type: "Child abuse & crisis support", icon: "phone-in-talk", color: "#2E7D32", bg: "#E8F5E9" },
  { name: "SAPS Family Violence", number: "0800 150 150", type: "Domestic & GBV helpline", icon: "hand-heart-outline", color: "#6B4FA0", bg: "#F0EBF8" },
  { name: "SADAG Crisis Line", number: "0800 21 22 23", type: "Mental health & suicide crisis", icon: "brain", color: "#F4861E", bg: "#FEF3E8" },
  { name: "Netcare 911", number: "082 911", type: "Private medical emergency", icon: "hospital-box-outline", color: "#00838F", bg: "#E0F4F7" },
];

interface ResourceRow {
  category: string;
  items: { name: string; number: string; note: string }[];
}

const RESOURCE_ROWS: ResourceRow[] = [
  {
    category: "CHILD & FAMILY",
    items: [
      { name: "Stop Gender Violence", number: "0800 428 428", note: "24hr helpline" },
      { name: "Missing Children SA", number: "116", note: "Child helpline" },
      { name: "NSPCA Animal Emergency", number: "011 907 3590", note: "Animals in distress" },
    ],
  },
  {
    category: "MENTAL HEALTH & SUPPORT",
    items: [
      { name: "Lifeline Crisis Counselling", number: "0861 322 322", note: "24hr counselling" },
      { name: "ADHD SA Helpline", number: "021 762 2702", note: "Mon–Fri 8am–4pm" },
      { name: "Autism SA", number: "011 484 9909", note: "Mon–Fri 9am–4pm" },
    ],
  },
  {
    category: "MEDICAL",
    items: [
      { name: "Poison Information Centre", number: "0800 333 444", note: "24hr toxicology" },
      { name: "Red Cross War Memorial", number: "021 658 5111", note: "Children's hospital" },
    ],
  },
];

function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.35, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, scale]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.pulseRing,
        { transform: [{ scale }], opacity },
      ]}
    />
  );
}

function callNumber(number: string) {
  const cleaned = number.replace(/\s/g, "");
  Linking.openURL(`tel:${cleaned}`).catch(() => {});
}

export function SosScreen() {
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tokens.spacing.xxxl + 60 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="h3" weight="black" style={{ color: "#fff" }}>
            SOS & Emergency
          </AppText>
          <AppText variant="caption" style={{ color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
            Help is one tap away
          </AppText>
        </View>

        {/* Big emergency call card */}
        <View style={styles.bigCard}>
          <View style={styles.pulseContainer}>
            <PulseDot />
            <View style={styles.pulseInner}>
              <AppText style={{ fontSize: 22 }}>🆘</AppText>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="body" weight="black" style={{ color: "#fff", fontSize: 15 }}>
              Emergency Services
            </AppText>
            <AppText variant="caption" style={{ color: "rgba(255,255,255,0.85)", marginTop: 1 }}>
              Police · Ambulance · Fire
            </AppText>
          </View>
          <Pressable
            style={styles.callBtn}
            onPress={() => callNumber("112")}
            accessibilityRole="button"
            accessibilityLabel="Call 112 emergency"
          >
            <MaterialCommunityIcons name="phone" size={16} color={SOS_RED} />
            <AppText variant="caption" weight="black" style={{ color: SOS_RED, marginLeft: 4 }}>
              CALL 112
            </AppText>
          </Pressable>
        </View>

        {/* Quick dial grid */}
        <View style={styles.gridSection}>
          {EMERGENCY_CONTACTS.map((c) => (
            <Pressable
              key={c.number}
              style={[styles.contactRow]}
              onPress={() => callNumber(c.number)}
              accessibilityRole="button"
              accessibilityLabel={`Call ${c.name} ${c.number}`}
            >
              <View style={[styles.contactIcon, { backgroundColor: c.bg }]}>
                <MaterialCommunityIcons name={c.icon as any} size={18} color={c.color} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="semibold" style={styles.contactName} numberOfLines={1}>
                  {c.name}
                </AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 1 }} numberOfLines={1}>
                  {c.type}
                </AppText>
              </View>
              <Pressable
                style={[styles.dialBtn, { backgroundColor: c.color }]}
                onPress={() => callNumber(c.number)}
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AppText variant="caption" weight="bold" style={{ color: "#fff", fontSize: 9 }}>
                  {c.number}
                </AppText>
              </Pressable>
            </Pressable>
          ))}
        </View>

        {/* Resource sections */}
        {RESOURCE_ROWS.map((section) => (
          <View key={section.category}>
            <AppText style={styles.sectionLabel}>{section.category}</AppText>
            {section.items.map((item) => (
              <Pressable
                key={item.number}
                style={styles.resourceRow}
                onPress={() => callNumber(item.number)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} ${item.number}`}
              >
                <MaterialCommunityIcons name="phone-outline" size={16} color="#888" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <AppText variant="body" weight="semibold" style={{ fontSize: 12, color: "#1A1A2E" }}>
                    {item.name}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>
                    {item.note}
                  </AppText>
                </View>
                <Pressable
                  style={styles.sosCallChip}
                  onPress={() => callNumber(item.number)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <AppText variant="caption" weight="bold" style={{ color: SOS_RED, fontSize: 9 }}>
                    {item.number}
                  </AppText>
                </Pressable>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: SOS_RED,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.lg,
  },
  bigCard: {
    backgroundColor: SOS_DARK,
    marginHorizontal: tokens.spacing.md,
    marginTop: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    ...Platform.select({
      ios: { shadowColor: SOS_RED, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  pulseContainer: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.4)",
    width: 46,
    height: 46,
  },
  pulseInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: tokens.radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  gridSection: {
    marginTop: tokens.spacing.sm,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#FFD0D0",
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm + 2,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  contactName: {
    fontSize: 12,
    color: "#1A1A2E",
  },
  dialBtn: {
    borderRadius: tokens.radius.sm,
    paddingVertical: 5,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: SOS_RED,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.xs,
    letterSpacing: 0.4,
  },
  resourceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#FFD0D0",
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm + 2,
  },
  sosCallChip: {
    borderWidth: 0.5,
    borderColor: SOS_RED,
    borderRadius: tokens.radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});
