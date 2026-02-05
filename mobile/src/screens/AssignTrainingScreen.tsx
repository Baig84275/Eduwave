import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { MainStackParamList } from "../navigation/MainStack";
import { AppButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { ScrollScreen } from "../ui/ScrollScreen";
import { AppText } from "../ui/Text";
import { ScreenHeader } from "../ui/ScreenHeader";
import { InlineAlert } from "../ui/InlineAlert";
import { TextField } from "../ui/TextField";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

type Props = NativeStackScreenProps<MainStackParamList, "AssignTraining">;

type User = {
  id: string;
  email: string;
};

type Course = {
  id: string;
  title: string;
  levelNumber: number;
  description: string | null;
};

export function AssignTrainingScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { config } = useAccessibility();
  const colors = config.color.colors;

  const [step, setStep] = useState<"facilitator" | "course">("facilitator");
  const [facilitators, setFacilitators] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  const [selectedFacilitator, setSelectedFacilitator] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const [facRes, courseRes] = await Promise.all([
        api.get<{ users: User[] }>(`/directory/users?role=FACILITATOR`, session),
        api.get<{ courses: Course[] }>("/training/courses", session)
      ]);
      setFacilitators(facRes.users);
      setCourses(courseRes.courses);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = async () => {
    if (!session || !selectedFacilitator || !selectedCourse) return;
    setAssigning(true);
    setError(null);
    try {
      await api.post(
        "/training/assign-course",
        {
          facilitatorId: selectedFacilitator.id,
          courseId: selectedCourse.id
        },
        session
      );
      setSuccess(`Assigned ${selectedCourse.title} to ${selectedFacilitator.email}`);
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (e: any) {
      setError(e?.message ?? "Failed to assign course");
      setAssigning(false);
    }
  };

  const filteredFacilitators = facilitators.filter(f => 
    f.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollScreen>
      <View style={{ gap: 16 }}>
        <ScreenHeader title="Assign Training" subtitle="Select a facilitator and a course" />

        {error ? <InlineAlert tone="danger" text={error} /> : null}
        {success ? <InlineAlert tone="success" text={success} /> : null}

        {step === "facilitator" ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="h3">1. Select Facilitator</AppText>
              <AppText variant="caption" tone="muted">Step 1 of 2</AppText>
            </View>
            
            <TextField 
              label="Search" 
              placeholder="Search by email..." 
              value={search} 
              onChangeText={setSearch} 
            />

            {loading ? (
              <AppText variant="body" tone="muted">Loading facilitators...</AppText>
            ) : (
              <View style={{ gap: 8 }}>
                {filteredFacilitators.map(user => {
                  const isSelected = selectedFacilitator?.id === user.id;
                  return (
                    <Pressable
                      key={user.id}
                      onPress={() => setSelectedFacilitator(user)}
                      style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                    >
                      <Card style={{ 
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                        backgroundColor: isSelected ? colors.surface : colors.surfaceAlt,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <View>
                          <AppText variant="body" weight="bold">{user.email}</AppText>
                          <AppText variant="caption" tone="muted">{user.id}</AppText>
                        </View>
                        {isSelected ? (
                          <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
                        ) : null}
                      </Card>
                    </Pressable>
                  );
                })}
                {filteredFacilitators.length === 0 ? (
                  <AppText variant="body" tone="muted">No facilitators found.</AppText>
                ) : null}
              </View>
            )}

            <AppButton 
              title="Next: Select Course" 
              disabled={!selectedFacilitator}
              onPress={() => setStep("course")}
            />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="h3">2. Select Course</AppText>
              <AppText variant="caption" tone="muted">Step 2 of 2</AppText>
            </View>

            <Card style={{ backgroundColor: colors.surfaceAlt }}>
              <AppText variant="caption" tone="muted">Assigning to:</AppText>
              <AppText variant="body" weight="bold">{selectedFacilitator?.email}</AppText>
              <Pressable onPress={() => setStep("facilitator")} style={{ marginTop: 8 }}>
                <AppText variant="label" tone="primary">Change</AppText>
              </Pressable>
            </Card>

            {loading ? (
              <AppText variant="body" tone="muted">Loading courses...</AppText>
            ) : (
              <View style={{ gap: 8 }}>
                {courses.map(course => {
                  const isSelected = selectedCourse?.id === course.id;
                  return (
                    <Pressable
                      key={course.id}
                      onPress={() => setSelectedCourse(course)}
                      style={({ pressed }) => [{ opacity: pressed ? config.motion.pressFeedbackOpacity : 1 }]}
                    >
                      <Card style={{ 
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                        backgroundColor: isSelected ? colors.surface : colors.surfaceAlt,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <View style={{ flex: 1 }}>
                          <AppText variant="body" weight="bold">{course.title}</AppText>
                          {course.description ? (
                            <AppText variant="caption" tone="muted" numberOfLines={2}>{course.description}</AppText>
                          ) : null}
                          <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>Level {course.levelNumber}</AppText>
                        </View>
                        {isSelected ? (
                          <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
                        ) : null}
                      </Card>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AppButton title="Back" variant="secondary" onPress={() => setStep("facilitator")} disabled={assigning} />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton 
                  title={assigning ? "Assigning..." : "Confirm Assignment"} 
                  disabled={!selectedCourse || assigning}
                  loading={assigning}
                  onPress={handleAssign}
                />
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollScreen>
  );
}
