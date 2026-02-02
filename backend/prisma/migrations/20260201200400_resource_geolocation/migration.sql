-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Resource_latitude_longitude_idx" ON "Resource"("latitude", "longitude");
