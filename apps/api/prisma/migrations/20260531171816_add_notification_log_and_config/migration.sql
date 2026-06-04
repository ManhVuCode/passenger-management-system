-- AlterTable
ALTER TABLE "TripPassengerAssignment" ADD COLUMN     "channelPref" TEXT,
ADD COLUMN     "contactOptOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "zaloId" TEXT;

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tripId" TEXT,
    "roundId" TEXT,
    "channel" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "templateKey" TEXT,
    "messageText" TEXT NOT NULL,
    "recipientRef" TEXT,
    "toContact" TEXT,
    "status" TEXT NOT NULL,
    "providerId" TEXT,
    "costMicro" INTEGER,
    "errorReason" TEXT,
    "rsvp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantNotificationConfig" (
    "tenantId" TEXT NOT NULL,
    "smsProvider" TEXT,
    "smsCredsRef" TEXT,
    "zaloOaId" TEXT,
    "voiceProvider" TEXT,
    "voiceCredsRef" TEXT,
    "autoRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantNotificationConfig_pkey" PRIMARY KEY ("tenantId")
);

-- CreateIndex
CREATE INDEX "NotificationLog_tenantId_tripId_roundId_idx" ON "NotificationLog"("tenantId", "tripId", "roundId");

-- CreateIndex
CREATE INDEX "NotificationLog_tenantId_createdAt_idx" ON "NotificationLog"("tenantId", "createdAt");

