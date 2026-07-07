-- Gỡ các cột legacy của tính năng voice/IVR đã bị loại bỏ (không còn được ghi ở bất kỳ đâu).
-- An toàn: dùng IF EXISTS để idempotent (không lỗi nếu đã bị drop thủ công trước đó).
ALTER TABLE "NotificationLog" DROP COLUMN IF EXISTS "rsvp";
ALTER TABLE "TenantNotificationConfig" DROP COLUMN IF EXISTS "voiceProvider";
ALTER TABLE "TenantNotificationConfig" DROP COLUMN IF EXISTS "voiceCredsRef";
