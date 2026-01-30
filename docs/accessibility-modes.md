# Accessibility Modes

EduWave uses a single, global Accessibility Mode system that affects the entire user experience (layout, typography, motion, and interaction) and is persisted per user.

## Modes

- STANDARD
- VISUAL_SUPPORT
- READING_DYSLEXIA
- HEARING_SUPPORT
- MOBILITY_SUPPORT
- NEURODIVERSE

## Backend (Prisma + PostgreSQL)

- Data model: `User.accessibilityMode` (nullable) in Prisma schema.
- On signup/login: the backend returns `accessibilityMode` with the `user` payload.
- Profile APIs:
  - `GET /users/me`
  - `PATCH /users/me/accessibility-mode` with `{ accessibilityMode: "<MODE>" }`

## Mobile (Global Mode Engine)

- Provider: `AccessibilityProvider` derives a config from the authenticated user’s saved mode and exposes `setMode(...)` to persist changes.
- Mandatory first-run selection: when a logged-in user has no saved mode, the app routes into the setup flow before any main screens render.
- UI behavior is config-driven through shared components:
  - Typography scale, spacing and letter spacing
  - High-contrast/calm palettes
  - Reduced motion (press feedback + future animation gating)
  - Minimum touch target sizing
  - Simplified vs standard density

## Extending Rules

Add or refine behavior for a mode in `mobile/src/accessibility/AccessibilityProvider.tsx`:
- `getTypographyForMode(...)`
- `getAccessibilityConfig(...)`
and update palette overrides in `mobile/src/theme/colors.ts`.

