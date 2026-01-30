export type Role = "PARENT" | "FACILITATOR" | "ADMIN" | "SUPER_ADMIN";

export type AccessibilityMode =
  | "STANDARD"
  | "VISUAL_SUPPORT"
  | "READING_DYSLEXIA"
  | "HEARING_SUPPORT"
  | "MOBILITY_SUPPORT"
  | "NEURODIVERSE";

export type User = {
  id: string;
  email: string;
  role: Role;
  accessibilityMode?: AccessibilityMode | null;
};

export type AuthSession = {
  accessToken: string;
  user: User;
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
