-- CreateTable
CREATE TABLE "TrainingReflection" (
    "id" TEXT NOT NULL,
    "facilitatorId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "moduleId" TEXT,
    "moduleName" TEXT NOT NULL,
    "reflectionText" TEXT NOT NULL,
    "applicationNote" TEXT NOT NULL,
    "challengesFaced" TEXT,
    "supportNeeded" TEXT,
    "wasHelpful" BOOLEAN,
    "helpfulRating" INTEGER,
    "confidenceChange" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingReflection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingReflection_facilitatorId_createdAt_idx" ON "TrainingReflection"("facilitatorId", "createdAt");

-- CreateIndex
CREATE INDEX "TrainingReflection_courseId_idx" ON "TrainingReflection"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingReflection_facilitatorId_moduleId_key" ON "TrainingReflection"("facilitatorId", "moduleId");

-- AddForeignKey
ALTER TABLE "TrainingReflection" ADD CONSTRAINT "TrainingReflection_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingReflection" ADD CONSTRAINT "TrainingReflection_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrainingModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
