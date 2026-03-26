import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
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
import { TrainingCourse, TrainingModuleFull } from "../api/types";

type RouteParams = { ManageCourseDetail: { courseId: string } };

type CourseDetail = TrainingCourse & { learnworldsUrl: string };

export function ManageCourseDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, "ManageCourseDetail">>();
  const { courseId } = route.params;
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [modules, setModules] = useState<TrainingModuleFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit course modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", levelNumber: "", description: "", learnworldsUrl: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Add module modal
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleForm, setModuleForm] = useState({ moduleName: "", lmsUrl: "" });
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [moduleSaving, setModuleSaving] = useState(false);

  // Delete module
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ course: CourseDetail; modules: TrainingModuleFull[] }>(
        `/training/courses/${courseId}/modules`,
        session
      );
      setCourse(res.course);
      setModules(res.modules);
      setEditForm({
        title: res.course.title,
        levelNumber: String(res.course.levelNumber),
        description: res.course.description ?? "",
        learnworldsUrl: res.course.learnworldsUrl
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to load course");
    } finally {
      setLoading(false);
    }
  }, [courseId, session]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleSaveEdit = async () => {
    const levelNum = parseInt(editForm.levelNumber, 10);
    if (!editForm.title.trim()) return setEditError("Title is required.");
    if (isNaN(levelNum) || levelNum < 1) return setEditError("Enter a valid level number (1 or higher).");
    if (!editForm.learnworldsUrl.trim()) return setEditError("LearnWorlds URL is required.");

    setEditSaving(true);
    setEditError(null);
    try {
      await api.patch(
        `/training/courses/${courseId}`,
        {
          title: editForm.title.trim(),
          levelNumber: levelNum,
          description: editForm.description.trim() || null,
          learnworldsUrl: editForm.learnworldsUrl.trim()
        },
        session
      );
      setShowEditModal(false);
      await loadDetail();
    } catch (e: any) {
      setEditError(e?.message ?? "Failed to update course");
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!course) return;
    const nextActive = !course.active;
    Alert.alert(
      nextActive ? "Activate Course" : "Deactivate Course",
      nextActive
        ? "Facilitators will be able to see this course again."
        : "Facilitators will no longer see this course. Existing assignments are not removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: nextActive ? "Activate" : "Deactivate",
          style: nextActive ? "default" : "destructive",
          onPress: async () => {
            try {
              await api.patch(`/training/courses/${courseId}`, { active: nextActive }, session);
              await loadDetail();
            } catch (e: any) {
              setError(e?.message ?? "Failed to update course");
            }
          }
        }
      ]
    );
  };

  const handleAddModule = async () => {
    if (!moduleForm.moduleName.trim()) return setModuleError("Module name is required.");
    if (!moduleForm.lmsUrl.trim()) return setModuleError("Module URL is required.");

    setModuleSaving(true);
    setModuleError(null);
    try {
      await api.post(
        "/training/modules",
        {
          courseId,
          moduleName: moduleForm.moduleName.trim(),
          lmsUrl: moduleForm.lmsUrl.trim()
        },
        session
      );
      setShowModuleModal(false);
      setModuleForm({ moduleName: "", lmsUrl: "" });
      await loadDetail();
    } catch (e: any) {
      setModuleError(e?.message ?? "Failed to add module");
    } finally {
      setModuleSaving(false);
    }
  };

  const handleDeleteModule = (mod: TrainingModuleFull) => {
    Alert.alert(
      "Delete Module",
      `Remove "${mod.moduleName}" from this course? This cannot be undone and will remove all existing assignments for this module.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingModuleId(mod.id);
            try {
              await api.del(`/training/modules/${mod.id}`, session);
              setModules((prev) => prev.filter((m) => m.id !== mod.id));
            } catch (e: any) {
              setError(e?.message ?? "Failed to delete module");
            } finally {
              setDeletingModuleId(null);
            }
          }
        }
      ]
    );
  };

  if (loading || !course) {
    return (
      <Screen>
        <AppText variant="body" tone="muted">{loading ? "Loading..." : error ?? "Course not found"}</AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={modules}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ gap: tokens.spacing.sm, paddingBottom: tokens.spacing.xl }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: tokens.spacing.md, marginBottom: tokens.spacing.sm }}>
            <ScreenHeader
              title={course.title}
              subtitle={`Level ${course.levelNumber} · ${modules.length} module${modules.length !== 1 ? "s" : ""}`}
            />

            {error ? <InlineAlert tone="danger" text={error} /> : null}

            {/* Course Info Card */}
            <Card style={{ gap: tokens.spacing.sm }}>
              {course.description ? (
                <AppText variant="body" tone="muted">{course.description}</AppText>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.xs }}>
                <MaterialCommunityIcons name="link" size={14} color={colors.textMuted} />
                <AppText variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                  {course.learnworldsUrl}
                </AppText>
              </View>
              <View
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: tokens.radius.full,
                  backgroundColor: course.active ? colors.successLight : colors.surfaceAlt
                }}
              >
                <AppText
                  variant="caption"
                  style={{ color: course.active ? colors.success : colors.textMuted }}
                >
                  {course.active ? "Active" : "Inactive"}
                </AppText>
              </View>
            </Card>

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: tokens.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <AppButton
                  title="Edit Course"
                  variant="secondary"
                  icon={<MaterialCommunityIcons name="pencil-outline" size={16} color={colors.primary} />}
                  onPress={() => { setShowEditModal(true); setEditError(null); }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  title={course.active ? "Deactivate" : "Activate"}
                  variant="secondary"
                  onPress={handleToggleActive}
                />
              </View>
            </View>

            <AppButton
              title="Assign This Course to Facilitator"
              icon={<MaterialCommunityIcons name="account-arrow-right-outline" size={18} color="#fff" />}
              onPress={() => navigation.navigate("AssignTraining")}
            />

            {/* Modules Section Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: tokens.spacing.xs }}>
              <AppText variant="h3" weight="bold">Modules</AppText>
              <Pressable
                onPress={() => { setShowModuleModal(true); setModuleError(null); setModuleForm({ moduleName: "", lmsUrl: "" }); }}
                style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                accessibilityLabel="Add module"
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: tokens.radius.md,
                    backgroundColor: colors.primaryLight ?? colors.surface,
                  }}
                >
                  <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                  <AppText variant="caption" style={{ color: colors.primary }}>Add Module</AppText>
                </View>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Card style={{ alignItems: "center", gap: tokens.spacing.sm }}>
            <MaterialCommunityIcons name="book-outline" size={36} color={colors.textMuted} />
            <AppText variant="body" tone="muted">No modules yet.</AppText>
            <AppText variant="caption" tone="muted">
              Add modules with their LearnWorlds lesson URLs so facilitators can track their progress.
            </AppText>
          </Card>
        }
        renderItem={({ item, index }) => (
          <Card
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: tokens.spacing.md
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: tokens.radius.md,
                backgroundColor: colors.surfaceAlt,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <AppText variant="caption" weight="bold" style={{ color: colors.textMuted }}>
                {index + 1}
              </AppText>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="body" weight="bold">{item.moduleName}</AppText>
              <AppText variant="caption" tone="muted" numberOfLines={1}>{item.lmsUrl}</AppText>
            </View>
            <Pressable
              onPress={() => handleDeleteModule(item)}
              disabled={deletingModuleId === item.id}
              style={({ pressed }) => [{ opacity: pressed || deletingModuleId === item.id ? 0.5 : 1 }]}
              accessibilityLabel={`Delete ${item.moduleName}`}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
            </Pressable>
          </Card>
        )}
      />

      {/* Edit Course Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
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
              <AppText variant="h3" weight="bold">Edit Course</AppText>
              <Pressable onPress={() => setShowEditModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={{ gap: tokens.spacing.sm }}>
                {editError ? <InlineAlert tone="danger" text={editError} /> : null}
                <TextField
                  label="Course Title"
                  value={editForm.title}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, title: v }))}
                />
                <TextField
                  label="Level Number"
                  value={editForm.levelNumber}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, levelNumber: v }))}
                  keyboardType="number-pad"
                />
                <TextField
                  label="Description (optional)"
                  value={editForm.description}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, description: v }))}
                  multiline
                  numberOfLines={3}
                />
                <TextField
                  label="LearnWorlds Course URL"
                  value={editForm.learnworldsUrl}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, learnworldsUrl: v }))}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            </ScrollView>
            <AppButton
              title={editSaving ? "Saving..." : "Save Changes"}
              loading={editSaving}
              disabled={editSaving}
              onPress={handleSaveEdit}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Module Modal */}
      <Modal visible={showModuleModal} animationType="slide" transparent onRequestClose={() => setShowModuleModal(false)}>
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
              gap: tokens.spacing.md
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <AppText variant="h3" weight="bold">Add Module</AppText>
              <Pressable onPress={() => setShowModuleModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>
            {moduleError ? <InlineAlert tone="danger" text={moduleError} /> : null}
            <TextField
              label="Module Name"
              placeholder="e.g. Module 1: Introduction"
              value={moduleForm.moduleName}
              onChangeText={(v) => setModuleForm((f) => ({ ...f, moduleName: v }))}
            />
            <TextField
              label="LearnWorlds Lesson URL"
              placeholder="https://..."
              value={moduleForm.lmsUrl}
              onChangeText={(v) => setModuleForm((f) => ({ ...f, lmsUrl: v }))}
              autoCapitalize="none"
              keyboardType="url"
            />
            <AppText variant="caption" tone="muted">
              Paste the direct URL to the lesson inside LearnWorlds. Facilitators will be taken here when they open this module.
            </AppText>
            <AppButton
              title={moduleSaving ? "Adding..." : "Add Module"}
              loading={moduleSaving}
              disabled={moduleSaving}
              onPress={handleAddModule}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
