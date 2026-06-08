-- Replace the Zalo contact channel with Telegram.
-- Rename the per-passenger Zalo OA id to a Telegram chat id (data is preserved).
ALTER TABLE "TripPassengerAssignment" RENAME COLUMN "zaloId" TO "telegramChatId";

-- Drop the unused per-tenant Zalo OA config; Telegram uses a global TELEGRAM_BOT_TOKEN env.
ALTER TABLE "TenantNotificationConfig" DROP COLUMN "zaloOaId";
