-- CreateEnum
CREATE TYPE "LanguageCode" AS ENUM ('EN', 'AF', 'XH', 'FR');

-- CreateEnum
CREATE TYPE "FacilitatorStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXITED');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('SCHOOL', 'THERAPIST_SPECIALIST', 'NGO', 'ORGANISATION', 'SUPPORT_SERVICE');

-- CreateEnum
CREATE TYPE "CheckInFrequency" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "SupportNeeded" AS ENUM ('NONE', 'SOME', 'URGENT');

-- CreateEnum
CREATE TYPE "TrainingCompletionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'TRAINER_SUPERVISOR';
ALTER TYPE "Role" ADD VALUE 'ORG_ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "facilitatorStatus" "FacilitatorStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "language" "LanguageCode" NOT NULL DEFAULT 'EN',
ADD COLUMN     "organisationId" TEXT;

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "contactInfo" TEXT,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilitatorCheckIn" (
    "id" TEXT NOT NULL,
    "facilitatorId" TEXT NOT NULL,
    "frequency" "CheckInFrequency" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "confidence" INTEGER NOT NULL,
    "emotionalLoad" INTEGER NOT NULL,
    "supportNeeded" "SupportNeeded" NOT NULL,
    "noteEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilitatorCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisionLog" (
    "id" TEXT NOT NULL,
    "facilitatorId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "childId" TEXT,
    "observationDate" TIMESTAMP(3) NOT NULL,
    "strengthsEnc" TEXT,
    "challengesEnc" TEXT,
    "strategiesEnc" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupervisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingModule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "lmsUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAssignment" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCompletion" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TrainingCompletionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Resource_province_category_idx" ON "Resource"("province", "category");

-- CreateIndex
CREATE INDEX "Resource_createdAt_idx" ON "Resource"("createdAt");

-- CreateIndex
CREATE INDEX "FacilitatorCheckIn_facilitatorId_createdAt_idx" ON "FacilitatorCheckIn"("facilitatorId", "createdAt");

-- CreateIndex
CREATE INDEX "FacilitatorCheckIn_supportNeeded_idx" ON "FacilitatorCheckIn"("supportNeeded");

-- CreateIndex
CREATE UNIQUE INDEX "FacilitatorCheckIn_facilitatorId_frequency_periodStart_key" ON "FacilitatorCheckIn"("facilitatorId", "frequency", "periodStart");

-- CreateIndex
CREATE INDEX "SupervisionLog_facilitatorId_createdAt_idx" ON "SupervisionLog"("facilitatorId", "createdAt");

-- CreateIndex
CREATE INDEX "SupervisionLog_followUpRequired_idx" ON "SupervisionLog"("followUpRequired");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingModule_courseId_moduleName_key" ON "TrainingModule"("courseId", "moduleName");

-- CreateIndex
CREATE INDEX "TrainingAssignment_userId_assignedAt_idx" ON "TrainingAssignment"("userId", "assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingAssignment_moduleId_userId_key" ON "TrainingAssignment"("moduleId", "userId");

-- CreateIndex
CREATE INDEX "TrainingCompletion_status_idx" ON "TrainingCompletion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCompletion_moduleId_userId_key" ON "TrainingCompletion"("moduleId", "userId");

-- CreateIndex
CREATE INDEX "User_organisationId_idx" ON "User"("organisationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilitatorCheckIn" ADD CONSTRAINT "FacilitatorCheckIn_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionLog" ADD CONSTRAINT "SupervisionLog_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionLog" ADD CONSTRAINT "SupervisionLog_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionLog" ADD CONSTRAINT "SupervisionLog_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrainingModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrainingModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
