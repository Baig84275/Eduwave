-- CreateEnum
CREATE TYPE "SettingContext" AS ENUM ('HOME', 'SCHOOL', 'MIXED', 'OTHER');

-- AlterTable
ALTER TABLE "FacilitatorCheckIn" ADD COLUMN     "monthNumber" INTEGER,
ADD COLUMN     "quarter" TEXT,
ADD COLUMN     "settingContext" "SettingContext",
ADD COLUMN     "specificEvent" TEXT,
ADD COLUMN     "weekNumber" INTEGER;

-- CreateIndex
CREATE INDEX "FacilitatorCheckIn_weekNumber_monthNumber_quarter_idx" ON "FacilitatorCheckIn"("weekNumber", "monthNumber", "quarter");
