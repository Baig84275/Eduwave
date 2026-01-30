-- CreateEnum
CREATE TYPE "AccessibilityMode" AS ENUM ('STANDARD', 'VISUAL_SUPPORT', 'READING_DYSLEXIA', 'HEARING_SUPPORT', 'MOBILITY_SUPPORT', 'NEURODIVERSE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accessibilityMode" "AccessibilityMode";
