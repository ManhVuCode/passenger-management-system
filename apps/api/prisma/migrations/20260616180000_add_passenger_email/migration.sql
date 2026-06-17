-- Email hành khách (không bắt buộc) — dùng cho kênh EMAIL gửi thông báo trước giờ khởi hành.
-- Hành khách không có email để trống (NULL); báo cáo điểm danh cuối chuyến vẫn gửi cho Admin.
ALTER TABLE "TripPassengerAssignment" ADD COLUMN "email" TEXT;
