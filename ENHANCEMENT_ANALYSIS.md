# EduWave Village - Enhancement Analysis Report
Generated: 2026-02-01

## Executive Summary
- Total features audited: 11
- Fully implemented: 6
- Partially implemented: 3
- Missing: 2

This report audits the current repository (backend + mobile) against the requirements specified in the latest scope document (Part 1 enhancements: 1.1–1.4; Part 2 enhancement: 2.1). It identifies what is already working (skip), what is partial (enhance), and what is absent (implement).

## Part 1 - Authentication & Core System

### 1.1 User Role System
**Requirement:** Support 7 distinct user roles (PARENT, FACILITATOR, TEACHER, THERAPIST, TRAINER_SUPERVISOR, ORG_ADMIN, SUPER_ADMIN).

**Current State:**
- Prisma `Role` enum currently includes: PARENT, FACILITATOR, TRAINER_SUPERVISOR, ORG_ADMIN, ADMIN, SUPER_ADMIN (missing TEACHER, THERAPIST; includes ADMIN which is not part of the required 7-role set): [schema.prisma](file:///Users/wshah/Documents/Eduwave/backend/prisma/schema.prisma)
- Public registration currently accepts only PARENT and FACILITATOR: [auth.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/auth.ts)
- Mobile registration UI currently supports only PARENT and FACILITATOR: [RegisterScreen.tsx](file:///Users/wshah/Documents/Eduwave/mobile/src/screens/RegisterScreen.tsx)
- Role changes are logged via audit events: [admin.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/admin.ts), [audit.ts](file:///Users/wshah/Documents/Eduwave/backend/src/audit/audit.ts)

**Status:** ⚠️ Partial

**Action Required:**
- Add TEACHER and THERAPIST roles to the role enum and propagate to backend validation and mobile registration role selection.
- Ensure privileged roles (ORG_ADMIN, SUPER_ADMIN) are not assignable via public registration (admin-only).
- Confirm whether ADMIN remains a valid internal role or should map to SUPER_ADMIN for the “7 roles” requirement (avoid role confusion).

### 1.2 Professional Invitation System
**Requirement:** Parents can invite professionals by email; professionals can accept/reject invitations. Includes expiry, duplicate prevention, and email notifications.

**Current State:**
- No `ProfessionalInvitation` model or `InvitationStatus` enum exists in Prisma schema.
- No invitations API routes exist.
- No mobile UI for sent/received invitations or acceptance flow exists.
- No email sending subsystem exists (no SMTP/email provider dependency currently in backend package.json).

**Status:** ❌ Missing

**Action Required:**
- Add invitation persistence layer (model + enum) with expiry and dedupe rules.
- Add invitation CRUD/accept/reject endpoints with role constraints (PARENT only can invite; recipient-only accept/reject; inviter-only cancel).
- Add an email sending module with environment-based configuration.
- Add mobile screens: invite form, sent list, received list, acceptance screen, and routing.

### 1.3 Enhanced Accessibility Modes
**Requirement:** Keep preset modes, but add granular user-configurable controls persisted in backend (JSON) and cached locally.

**Current State:**
- Accessibility “mode” is first-run mandatory and globally applied through a central provider (not a hidden toggle): [App.tsx](file:///Users/wshah/Documents/Eduwave/mobile/App.tsx), [SetupStack.tsx](file:///Users/wshah/Documents/Eduwave/mobile/src/navigation/SetupStack.tsx), [AccessibilityProvider.tsx](file:///Users/wshah/Documents/Eduwave/mobile/src/accessibility/AccessibilityProvider.tsx)
- Current implementation uses fixed preset behavior per mode (fontScale, contrast, reduced motion, etc.) but there is no persisted per-user granular config.
- Backend stores only `accessibilityMode` (no JSON config field): [schema.prisma](file:///Users/wshah/Documents/Eduwave/backend/prisma/schema.prisma), [users.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/users.ts)

**Status:** ⚠️ Partial

**Action Required:**
- Add `accessibilityConfig` (JSON) to User model.
- Add endpoints: GET/PATCH config, POST reset-to-defaults.
- Update mobile provider to load config at start, cache locally, and apply dynamic theme changes based on config.
- Add a dedicated Accessibility Settings screen for granular controls.

### 1.4 Enhanced RBAC (Role Hierarchy + Denial Logging + Query Filters)
**Requirement:** Hierarchical role access (SUPER_ADMIN > ORG_ADMIN > TRAINER_SUPERVISOR > THERAPIST/TEACHER > FACILITATOR > PARENT), consistent middleware, Prisma query filters, frontend-based visibility, and logging for access denials.

**Current State:**
- Backend has `requireRole` middleware but it is a direct allowlist without hierarchy semantics: [rbac.ts](file:///Users/wshah/Documents/Eduwave/backend/src/middleware/rbac.ts)
- Some organisation scoping exists in specific places (directory/check-ins/supervision/training assignment scoping), but not as a single reusable “role-to-scope” query filter utility:
  - [directory.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/directory.ts)
  - [checkIns.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/checkIns.ts)
  - [supervisionLogs.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/supervisionLogs.ts)
- Audit events exist for many actions, but “RBAC denial logging” is not systematically implemented on access denials.
- Mobile shows/hides some options by role in UI, but it is incomplete and not aligned to a full 7-role system: [ChildListScreen.tsx](file:///Users/wshah/Documents/Eduwave/mobile/src/screens/ChildListScreen.tsx)

**Status:** ⚠️ Partial

**Action Required:**
- Implement hierarchical RBAC middleware (SUPER_ADMIN implies access to lower roles).
- Centralize Prisma scoping utilities based on role and organisation link.
- Add logging for RBAC denials (include userId, role, route/action, IP).
- Extend frontend navigation visibility rules to incorporate TEACHER/THERAPIST flows.

## Part 2 - Resource Database & Facilitator Features

### 2.1 Resource Geolocation & Maps
**Requirement:** Resources have lat/lng fields, map view with markers, proximity search API.

**Current State:**
- Resource directory exists (province/city/category/tags) but no lat/lng fields: [schema.prisma](file:///Users/wshah/Documents/Eduwave/backend/prisma/schema.prisma)
- No proximity search endpoint exists.
- No mobile map view exists (Expo maps package not present in dependencies): [mobile/package.json](file:///Users/wshah/Documents/Eduwave/mobile/package.json)

**Status:** ❌ Missing

**Action Required:**
- Add lat/lng fields to Resource model (nullable).
- Add proximity search API (lat/lng/radius) with safe defaults and validation.
- Add map screen in mobile and a simple “view on map” entry from resource results.

## Additional Scope-Relevant Features (Already Implemented)

### Check-ins (Facilitator wellbeing)
**Status:** ✅ Complete
- Backend + mobile check-in flow exists with 1–5 scales, support-needed, optional note, and timestamping: [checkIns.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/checkIns.ts), [CheckInScreen.tsx](file:///Users/wshah/Documents/Eduwave/mobile/src/screens/CheckInScreen.tsx)

### Training tracking (not LMS)
**Status:** ✅ Complete
- External links only, completion metadata tracked: [training.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/training.ts), [TrainingHubScreen.tsx](file:///Users/wshah/Documents/Eduwave/mobile/src/screens/TrainingHubScreen.tsx)

### Supervision logs (one-way)
**Status:** ✅ Complete
- Trainer input and facilitator acknowledgement only; no reply threads: [supervisionLogs.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/supervisionLogs.ts)

### Trainer dashboard (aggregated)
**Status:** ✅ Complete
- Aggregated-only signals and simple visuals; no identifiers/child data: [trainerDashboard.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/trainerDashboard.ts), [TrainerDashboardScreen.tsx](file:///Users/wshah/Documents/Eduwave/mobile/src/screens/TrainerDashboardScreen.tsx)

### Reporting (exports)
**Status:** ✅ Complete for quarterly PDF + CSV/JSON exports
- Quarterly PDF export exists and is organisation-scoped: [exports.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/exports.ts)

## Implementation Priority Queue
Based on the analysis above, implement in this order:
1. Professional Invitation & Approval System (1.2)
2. Extended User Role System (1.1) with registration/UI alignment
3. Enhanced Accessibility Config system (1.3)
4. Enhanced RBAC hierarchy + denial logging + query scoping utilities (1.4)
5. Resource Geolocation & Maps (2.1)

## Estimated Implementation Effort
- Critical features: 4 (1.1, 1.2, 1.3, 1.4)
- Important features: 1 (2.1)
- Nice-to-have: 0 (not assessed in this report)

