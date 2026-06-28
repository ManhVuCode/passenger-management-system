-- Chỉ Tên + Thứ tự của chặng là bắt buộc; điểm đi/đến và giờ trở thành tuỳ chọn.
ALTER TABLE "Round" ALTER COLUMN "departurePoint" DROP NOT NULL;
ALTER TABLE "Round" ALTER COLUMN "arrivalPoint" DROP NOT NULL;
ALTER TABLE "Round" ALTER COLUMN "scheduledDep" DROP NOT NULL;
ALTER TABLE "Round" ALTER COLUMN "scheduledArr" DROP NOT NULL;

-- Hành khách: chỉ cần Tên — SĐT trở thành tuỳ chọn (thiếu SĐT vẫn nhập được).
ALTER TABLE "TripPassengerAssignment" ALTER COLUMN "phone" DROP NOT NULL;
