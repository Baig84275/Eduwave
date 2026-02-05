-- AlterTable
ALTER TABLE "SupervisionLog" ADD COLUMN     "actionsTakenEnc" TEXT,
ADD COLUMN     "facilitatorResponseEnc" TEXT,
ADD COLUMN     "followUpCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "outcomeNotesEnc" TEXT,
ADD COLUMN     "previousLogId" TEXT;

-- CreateIndex
CREATE INDEX "SupervisionLog_followUpCompleted_idx" ON "SupervisionLog"("followUpCompleted");

-- AddForeignKey
ALTER TABLE "SupervisionLog" ADD CONSTRAINT "SupervisionLog_previousLogId_fkey" FOREIGN KEY ("previousLogId") REFERENCES "SupervisionLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
