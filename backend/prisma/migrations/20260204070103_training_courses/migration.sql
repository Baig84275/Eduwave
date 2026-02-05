-- CreateTable
CREATE TABLE "TrainingCourse" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "description" TEXT,
    "learnworldsUrl" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCourse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingCourse_levelNumber_idx" ON "TrainingCourse"("levelNumber");

-- CreateIndex
CREATE INDEX "TrainingCourse_active_idx" ON "TrainingCourse"("active");
