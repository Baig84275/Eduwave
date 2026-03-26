import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, View, Modal, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { AppText } from "../ui/Text";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";
import { TextField } from "../ui/TextField";
import { tokens } from "../theme/tokens";
import { TrainingCourse } from "../api/types";

type CourseItem = TrainingCourse & { learnworldsUrl: string };

const initialForm = { title: "", levelNumber: "", description: "", learnworldsUrl: "" };

export function ManageCoursesScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCourses = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ courses: CourseItem[] }>("/training/courses?includeInactive=true", session);
      setCourses(res.courses);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleCreate = async () => {
    const levelNum = parseInt(form.levelNumber, 10);
    if (!form.title.trim()) return setFormError("Title is required.");
    if (!form.levelNumber.trim() || isNaN(levelNum) || levelNum < 1) return setFormError("Enter a valid level number (1 or higher).");
    if (!form.learnworldsUrl.trim()) return setFormError("LearnWorlds URL is required.");

    setSaving(true);
    setFormError(null);
    try {
      await api.post(
        "/training/courses",
        {
          title: form.title.trim(),
          levelNumber: levelNum,
          description: form.description.trim() || null,
          learnworldsUrl: form.learnworldsUrl.trim()
        },
        session
      );
      setShowModal(false);
      setForm(initialForm);
      await loadCourses();
    } catch (e: any) {
      setFormError(e?.message ?? "Failed to create course");
    } finally {
      setSaving(false);
    }
  };

  const activeCourses = courses.filter((c) => c.active);
  const inactiveCourses = courses.filter((c) => !c.active);

  return (
    <Screen>
      <FlatList
        data={courses}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ gap: tokens.spacing.sm, paddingBottom: tokens.spacing.xl }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: tokens.spacing.md, marginBottom: tokens.spacing.sm }}>
            <ScreenHeader
              title="Manage Courses"
              subtitle={`${activeCourses.length} active · ${inactiveCourses.length} inactive`}
            />
            {error ? <InlineAlert tone="danger" text={error} /> : null}
            <AppButton
              title="Create New Course"
              icon={<MaterialCommunityIcons name="plus" size={18} color="#fff" />}
              onPress={() => { setShowModal(true); setFormError(null); setForm(initialForm); }}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <AppText variant="body" tone="muted">Loading courses...</AppText>
          ) : (
            <Card style={{ alignItems: "center", gap: tokens.spacing.sm }}>
              <MaterialCommunityIcons name="school-outline" size={40} color={colors.textMuted} />
              <AppText variant="body" tone="muted">No courses yet. Create one to get started.</AppText>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate("ManageCourseDetail", { courseId: item.id })}
            style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
          >
            <Card
              style={{
                gap: tokens.spacing.xs,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: item.active ? 1 : 0.6
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="body" weight="bold" style={{ color: colors.text }}>
                    {item.title}
                  </AppText>
                  <AppText variant="caption" tone="muted">Level {item.levelNumber}</AppText>
                  {item.description ? (
                    <AppText variant="caption" tone="muted" numberOfLines={2}>
                      {item.description}
                    </AppText>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: tokens.radius.full,
                      backgroundColor: item.active ? colors.successLight : colors.surfaceAlt
                    }}
                  >
                    <AppText
                      variant="caption"
                      style={{ color: item.active ? colors.success : colors.textMuted }}
                    >
                      {item.active ? "Active" : "Inactive"}
                    </AppText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: tokens.radius.xl,
              borderTopRightRadius: tokens.radius.xl,
              padding: tokens.spacing.lg,
              gap: tokens.spacing.md,
              maxHeight: "90%"
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <AppText variant="h3" weight="bold">New Course</AppText>
              <Pressable onPress={() => setShowModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={{ gap: tokens.spacing.sm }}>
                {formError ? <InlineAlert tone="danger" text={formError} /> : null}
                <TextField
                  label="Course Title"
                  placeholder="e.g. Child Development Fundamentals"
                  value={form.title}
                  onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
                />
                <TextField
                  label="Level Number"
                  placeholder="e.g. 1"
                  value={form.levelNumber}
                  onChangeText={(v) => setForm((f) => ({ ...f, levelNumber: v }))}
                  keyboardType="number-pad"
                />
                <TextField
                  label="Description (optional)"
                  placeholder="Brief description of this course"
                  value={form.description}
                  onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                  multiline
                  numberOfLines={3}
                />
                <TextField
                  label="LearnWorlds Course URL"
                  placeholder="https://..."
                  value={form.learnworldsUrl}
                  onChangeText={(v) => setForm((f) => ({ ...f, learnworldsUrl: v }))}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            </ScrollView>

            <AppButton
              title={saving ? "Creating..." : "Create Course"}
              loading={saving}
              disabled={saving}
              onPress={handleCreate}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
