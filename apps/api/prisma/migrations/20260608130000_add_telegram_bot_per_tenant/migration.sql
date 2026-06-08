-- Per-tenant Telegram bot (1 bot / 1 operator): token + username for the registration bot.
ALTER TABLE "TenantNotificationConfig" ADD COLUMN "telegramBotToken" TEXT;
ALTER TABLE "TenantNotificationConfig" ADD COLUMN "telegramBotUsername" TEXT;
