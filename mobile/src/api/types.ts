export type Role =
  | "PARENT"
  | "FACILITATOR"
  | "TEACHER"
  | "THERAPIST"
  | "TRAINER_SUPERVISOR"
  | "ORG_ADMIN"
  | "ADMIN"
  | "SUPER_ADMIN";

export type AdminPermission = "DELETE_USERS" | "DELETE_CHILDREN";

export type LanguageCode = "EN" | "AF" | "XH" | "FR";

export type FacilitatorStatus = "ACTIVE" | "PAUSED" | "EXITED";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export type AccessibilityMode =
  | "STANDARD"
  | "VISUAL_SUPPORT"
  | "READING_DYSLEXIA"
  | "HEARING_SUPPORT"
  | "MOBILITY_SUPPORT"
  | "NEURODIVERSE";

export type AccessibilityUserConfig = {
  fontSize: "small" | "medium" | "large" | "extra-large";
  lineSpacing: "compact" | "normal" | "relaxed" | "extra-relaxed";
  iconSize: "default" | "large" | "extra-large";
  reducedMotion: boolean;
  highContrast: boolean;
  colorScheme: "default" | "warm" | "cool" | "monochrome";
};

export type User = {
  id: string;
  email: string;
  role: Role;
  accessibilityMode?: AccessibilityMode | null;
  accessibilityConfig?: AccessibilityUserConfig | null;
  language?: LanguageCode;
  facilitatorStatus?: FacilitatorStatus;
  organisationId?: string | null;
};

export type AuthSession = {
  accessToken: string;
  user: User;
};

export type ProfessionalInvitation = {
  id: string;
  invitedById?: string;
  inviteeEmail: string;
  inviteeRole: Role;
  status: InvitationStatus;
  message?: string | null;
  expiresAt: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Child = {
  id: string;
  parentId?: string;
  name: string;
  dateOfBirth: string;
  healthStatus?: string | null;
  profilePictureUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Media = {
  id: string;
  kind: "IMAGE" | "VIDEO" | "DOCUMENT";
  url: string;
  mimeType?: string | null;
  fileName?: string | null;
  size?: number | null;
};

export type ProgressUpdate = {
  id: string;
  childId: string;
  type: "MILESTONE" | "NOTE" | "MEDIA";
  status: "APPROVED" | "PENDING_PARENT_APPROVAL" | "REJECTED";
  milestoneTitle?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string | null;
  media: Media[];
};

export type ResourceCategory =
  | "SCHOOL"
  | "THERAPIST_SPECIALIST"
  | "NGO"
  | "ORGANISATION"
  | "SUPPORT_SERVICE";

export type Resource = {
  id: string;
  name: string;
  category: ResourceCategory;
  province: string;
  city: string;
  town?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number;
  distance?: number;
  imageUrl?: string | null;
  logoUrl?: string | null;
  iconCategory?: string | null;
  contactInfo?: string | null;
  description?: string | null;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type CheckInFrequency = "DAILY" | "WEEKLY";
export type SupportNeeded = "NONE" | "SOME" | "URGENT";
export type SettingContext = "HOME" | "SCHOOL" | "MIXED" | "OTHER";

export type FacilitatorCheckIn = {
  id: string;
  frequency: CheckInFrequency;
  periodStart: string;
  confidence: number;
  emotionalLoad: number;
  supportNeeded: SupportNeeded;
  settingContext?: SettingContext | null;
  specificEvent?: string | null;
  weekNumber?: number | null;
  monthNumber?: number | null;
  quarter?: string | null;
  note?: string | null;
  createdAt: string;
};

export type JourneyPoint = { weekStart: string; value: number };

export type Journey = {
  weeksActive: number;
  totalCheckIns: number;
  trainingCompletedCount: number;
  supportSessionsCount: number;
  confidenceTrend: JourneyPoint[];
  emotionalLoadTrend: JourneyPoint[];
  supportFlagsHistory: Array<{ createdAt: string; supportNeeded: SupportNeeded }>;
  currentStatus: FacilitatorStatus | null;
};

export type SupervisionLog = {
  id: string;
  facilitatorId: string;
  supervisorId: string;
  childId?: string | null;
  observationDate: string;
  strengths?: string | null;
  challenges?: string | null;
  strategies?: string | null;
  followUpRequired: boolean;
  followUpDate?: string | null;
  followUpCompleted?: boolean;
  facilitatorResponse?: string | null;
  actionsTaken?: string | null;
  outcomeNotes?: string | null;
  previousLogId?: string | null;
  acknowledgedAt?: string | null;
  createdAt: string;
};

export type TrainingCompletionStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export type TrainingModule = {
  id: string;
  courseId: string;
  moduleName: string;
  lmsUrl: string;
};

export type TrainingModuleItem = {
  module: TrainingModule;
  assignedAt: string;
  status: TrainingCompletionStatus;
  completedAt?: string | null;
};

export type TrainingCourse = {
  id: string;
  title: string;
  levelNumber: number;
  description?: string | null;
  learnworldsUrl: string;
  active: boolean;
};

export type MyTrainingCourse = {
  course: TrainingCourse;
  modules: Array<{
    id: string;
    moduleName: string;
    externalUrl: string;
    assignedAt: string;
    completionStatus: TrainingCompletionStatus;
    completionDate?: string | null;
  }>;
};

export type TrainingReflection = {
  id: string;
  facilitatorId?: string;
  courseId: string;
  moduleId?: string | null;
  moduleName: string;
  reflectionText: string;
  applicationNote: string;
  challengesFaced?: string | null;
  supportNeeded?: string | null;
  wasHelpful?: boolean | null;
  helpfulRating?: number | null;
  confidenceChange?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type TrainingJourney = {
  facilitatorId: string;
  stats: { assignedCount: number; completedCount: number; reflectionsCount: number };
  confidenceTrend: Array<{ createdAt: string; confidenceChange: number }>;
  courses: Array<{ courseId: string; reflections: TrainingReflection[] }>;
};

export type Organisation = {
  id: string;
  name: string;
  city?: string | null;
  province?: string | null;
};

export type OrgOverview = {
  organisationId: string | null;
  checkIns: {
    total: number;
    avgConfidence: number | null;
    avgEmotionalLoad: number | null;
    supportNeededCounts: Record<SupportNeeded, number>;
  };
  supervision: {
    total: number;
    followUpRequiredTotal: number;
  };
  training: {
    completionCounts: Record<TrainingCompletionStatus, number>;
  };
};
