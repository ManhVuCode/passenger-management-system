-- Bản mã hoá 2 chiều của mật khẩu để SystemAdmin xem lại (cột tuỳ chọn).
ALTER TABLE "User" ADD COLUMN "passwordEnc" TEXT;
