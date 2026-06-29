-- Thứ tự hiển thị xe trong đội (Admin đổi chỗ kiểu swap).
ALTER TABLE "Bus" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: đánh số tuần tự theo thời điểm tạo, riêng từng tenant.
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "tenantId" ORDER BY "createdAt" ASC) AS rn
  FROM "Bus"
)
UPDATE "Bus" AS b SET "order" = o.rn FROM ordered AS o WHERE b."id" = o."id";
