-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "ProfessionalInvitation" (
    "id" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "inviteeRole" "Role" NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalConnection" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfessionalInvitation_inviteeEmail_idx" ON "ProfessionalInvitation"("inviteeEmail");

-- CreateIndex
CREATE INDEX "ProfessionalInvitation_status_idx" ON "ProfessionalInvitation"("status");

-- CreateIndex
CREATE INDEX "ProfessionalConnection_professionalId_idx" ON "ProfessionalConnection"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalConnection_parentId_professionalId_key" ON "ProfessionalConnection"("parentId", "professionalId");

-- AddForeignKey
ALTER TABLE "ProfessionalInvitation" ADD CONSTRAINT "ProfessionalInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalConnection" ADD CONSTRAINT "ProfessionalConnection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalConnection" ADD CONSTRAINT "ProfessionalConnection_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
