# Swagger API Documentation Guide
## Tài liệu API — MPMS

---

## 1. Truy cập Swagger UI

### Bước 1 — Khởi động API server

Mở terminal tại thư mục root của monorepo và chạy:

```bash
cd ~/thesis/passenger-management-system
pnpm --filter api dev
```

Khi server đã khởi động xong sẽ thấy log:

```
API running on http://localhost:3000
Swagger UI on http://localhost:3000/api/docs
WebSocket gateway on ws://localhost:3000/attendance
```

> Lưu ý: API mặc định lắng nghe trên **port 3000** (cấu hình trong `apps/api/.env`). Trước khi chạy, đảm bảo PostgreSQL đang chạy và đã thực hiện `pnpm --filter api db:migrate` + seed dữ liệu nếu cần.

### Bước 2 — Mở trình duyệt

URL: **http://localhost:3000/api/docs**

Giao diện Swagger UI sẽ hiển thị:
- Tiêu đề **Passenger Management System API**, version 1.0
- Danh sách tất cả endpoints được nhóm theo controller (Trips, Rounds, Buses, Passengers, Allocation, Attendance, Notifications, Auth, Me, System Tenants, Health…)
- Nút **Authorize** (biểu tượng ổ khóa) ở góc trên bên phải để gắn JWT token
- Mỗi endpoint có thể mở rộng để xem method, path, parameters, request body schema và try-it-out

---

## 2. Xác thực (Authentication)

Hầu hết các endpoint đều yêu cầu JWT Bearer token. Chỉ `POST /auth/login` và `GET /health` là public (không cần token).

### Lấy token
1. Tìm endpoint `POST /auth/login`
2. Click **Try it out**
3. Điền body:
```json
{
  "email": "admin@demo.com",
  "password": "password123"
}
```
4. Click **Execute**
5. Copy giá trị `accessToken` từ response (nằm trong `data.accessToken` của BaseResponse, hoặc `accessToken` ở top-level tùy phiên bản)

### Gắn token vào Swagger
1. Click nút **Authorize** (ổ khóa) ở góc trên bên phải
2. Trong ô **BearerAuth**, điền: `<accessToken>` (chỉ chuỗi token, KHÔNG cần prefix `Bearer `)
3. Click **Authorize** → **Close**
4. Tất cả request tiếp theo sẽ tự động có header `Authorization: Bearer <token>`

> Khi token hết hạn (mặc định 7 ngày), API trả về `AUTH_003 TOKEN_EXPIRED` → đăng nhập lại để lấy token mới.

---

## 3. Demo accounts

Tất cả tài khoản đều dùng password: `password123`.

| Email | Role | Tenant | Mục đích |
|-------|------|--------|---------|
| `sysadmin@platform.com` | `SYSTEM_ADMIN` | Platform | Quản trị nền tảng — quản lý tenants, system-wide config |
| `admin@demo.com` | `ADMIN` | Demo Tours | Trip coordinator — full CRUD trips/rounds/buses/passengers, phân công, override attendance |
| `driver@demo.com` | `BUS_MANAGER` | Demo Tours | Tài xế — chỉ điểm danh trên xe được giao + cập nhật trạng thái chặng |
| `admin2@other.com` | `ADMIN` | Other Tours | Admin tenant thứ 2 — dùng để test tenant isolation (cross-tenant phải trả 403) |

---

## 4. Các endpoint chính

### Auth
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/auth/login` | Đăng nhập, nhận JWT token (public) |
| POST | `/auth/change-password` | Đổi mật khẩu của user hiện tại |

### Me
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/me/assignments` | Danh sách phân công của user hiện tại (chủ yếu cho BusManager) |

### Trips (Chuyến đi)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/trips` | Danh sách chuyến đi của tenant |
| GET | `/trips/:id` | Chi tiết chuyến đi (kèm rounds) |
| POST | `/trips` | Tạo chuyến đi mới — Admin (tên không được chứa `/`) |
| PATCH | `/trips/:id` | Cập nhật chuyến đi — Admin |
| DELETE | `/trips/:id` | Xóa chuyến đi — Admin |

### Rounds (Chặng)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/trips/:tripId/rounds` | Danh sách chặng của trip |
| GET | `/trips/:tripId/rounds/:id` | Chi tiết chặng |
| POST | `/trips/:tripId/rounds` | Tạo chặng — Admin |
| PATCH | `/trips/:tripId/rounds/:id/status` | Cập nhật trạng thái `PLANNED → IN_PROGRESS → DONE \| CANCELLED` (Admin hoặc BusManager của chặng đó) |
| DELETE | `/trips/:tripId/rounds/:id` | Xóa chặng — Admin |

### Buses (Xe)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/buses` | Danh sách xe của tenant |
| GET | `/buses/:id` | Chi tiết xe (kèm 3 ảnh front/side/rear) |
| POST | `/buses` | Đăng ký xe mới — Admin, **bắt buộc 3 ảnh** (photoFront, photoSide, photoRear) |
| PATCH | `/buses/:id` | Cập nhật thông tin xe — Admin |
| DELETE | `/buses/:id` | Xóa xe — Admin |

### Assignment — Bus & BusManager vào Round
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/trips/:tripId/rounds/:roundId/buses` | Danh sách xe được gán cho chặng |
| POST | `/trips/:tripId/rounds/:roundId/buses` | Gán xe vào chặng — Admin (warning khi vượt capacity) |
| DELETE | `/trips/:tripId/rounds/:roundId/buses/:busId` | Gỡ xe khỏi chặng — Admin |
| POST | `/trips/:tripId/rounds/:roundId/buses/:busId/manager` | Gán BusManager vào (chặng, xe) — Admin (1 driver/bus/round) |
| DELETE | `/trips/:tripId/rounds/:roundId/buses/:busId/manager` | Gỡ BusManager — Admin |

### Passengers (Hành khách)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/trips/:tripId/passengers` | Danh sách hành khách của trip |
| GET | `/trips/:tripId/passengers/export/xlsx` | Xuất xlsx cho kế toán — Admin |
| POST | `/trips/:tripId/passengers` | Thêm 1 hành khách thủ công — Admin |
| POST | `/trips/:tripId/passengers/bulk` | Thêm hàng loạt — Admin |
| POST | `/trips/:tripId/passengers/sheet-sync` | Sync từ Google Sheet (Mode A/B, trigger thủ công) — Admin |
| PATCH | `/trips/:tripId/passengers/:id` | Cập nhật thông tin / `note` — Admin |
| DELETE | `/trips/:tripId/passengers/:id` | Xóa hành khách — Admin |

### Allocation (Phân công hành khách vào xe theo chặng)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/trips/:tripId/rounds/allocations-summary` | Tổng quan phân công cho cả trip |
| GET | `/trips/:tripId/rounds/:roundId/allocations` | Phân công của chặng (tất cả xe) |
| GET | `/trips/:tripId/rounds/:roundId/buses/:busId/allocations` | Phân công của 1 xe trong chặng |
| POST | `/trips/:tripId/rounds/:roundId/buses/:busId/allocations` | Phân hành khách vào xe — Admin |
| DELETE | `/trips/:tripId/rounds/:roundId/allocations/:assignmentId` | Hủy phân công — Admin |
| PATCH | `/trips/:tripId/rounds/:roundId/allocations/:assignmentId/move` | Chuyển hành khách sang xe khác — **Admin only, chỉ khi round = PLANNED** |

### Attendance (Điểm danh)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/trips/:tripId/rounds/:roundId/buses/:busId/attendance` | Danh sách điểm danh của 1 xe trong chặng |
| GET | `/trips/:tripId/rounds/:roundId/attendance/summary` | Tổng quan điểm danh của chặng |
| POST | `/trips/:tripId/rounds/:roundId/buses/:busId/attendance` | Đánh dấu `JOIN`/`ABSENT` — Admin hoặc BusManager (BusManager chỉ trên xe được giao) |
| PATCH | `/trips/:tripId/rounds/:roundId/attendance/:recordId/override` | Override bản ghi điểm danh — Admin |
| PATCH | `/trips/:tripId/rounds/:roundId/note` | Ghi chú vận hành cho chặng — Admin |

### Notifications
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/trips/:tripId/rounds/:roundId/notify` | Gửi thông báo cho hành khách trong chặng (SMS / Teams / Telegram / broadcast call) — Admin |

### System Tenants (SystemAdmin)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/system/tenants` | Liệt kê tất cả tenants |
| GET | `/system/tenants/current/users` | Liệt kê users của tenant hiện tại (Admin/SystemAdmin) — có thể filter `?role=` |
| POST | `/system/tenants` | Tạo tenant mới |
| PATCH | `/system/tenants/:id` | Cập nhật tenant |
| GET | `/system/tenants/:id/users` | Liệt kê users của 1 tenant |
| POST | `/system/tenants/:id/users` | Tạo user trong tenant |
| PATCH | `/system/tenants/:id/users/:userId` | Cập nhật user |
| DELETE | `/system/tenants/:id/users/:userId` | Xóa user |

### Health
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/health` | Health check (public) — trả về `{ status, timestamp, uptime }` |

---

## 5. Cách test một endpoint trong Swagger

Step-by-step với ví dụ tạo chuyến đi mới:

1. Login bằng `admin@demo.com / password123` và Authorize bằng accessToken (xem mục 2).
2. Mở section **Trips**
3. Click `POST /trips`
4. Click **Try it out**
5. Sửa request body:
```json
{
  "name": "Ha Noi - Sa Pa",
  "startDate": "2026-12-01",
  "endDate": "2026-12-03"
}
```
6. Click **Execute**
7. Xem **Response body** — phải trả về `{ code: "0", success: true, data: {...} }`

> Lỗi thường gặp khi test:
> - `400 SYS_005 VALIDATION_ERROR`: thiếu field bắt buộc hoặc sai format (vd. trip name chứa `/`).
> - `401 SYS_003 UNAUTHORIZED`: chưa Authorize hoặc token hết hạn.
> - `403 SYS_004 FORBIDDEN`: role không đủ quyền (vd. BusManager gọi `POST /trips`) hoặc cross-tenant.

---

## 6. Response format chuẩn

Sau refactor BaseResponse, tất cả response đều có format thống nhất.

### Thành công
```json
{
  "code": "0",
  "message": "Success",
  "success": true,
  "data": { ... },
  "timestamp": "2026-05-21T..."
}
```

Với endpoint paginated, kèm thêm `pagination`:
```json
{
  "code": "0",
  "message": "Success",
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "size": 20, "totalElements": 137, "totalPages": 7 },
  "timestamp": "2026-05-21T..."
}
```

### Lỗi
```json
{
  "code": "TRIP_001",
  "message": "Trip not found.",
  "success": false,
  "timestamp": "2026-05-21T..."
}
```

### Error codes

Danh sách đầy đủ trong `apps/api/src/common/models/app-error.enum.ts`:

| Code | Ý nghĩa |
|------|---------|
| `SYS_001` | SYSTEM_ERROR — Lỗi hệ thống |
| `SYS_002` | NOT_FOUND — Không tìm thấy tài nguyên |
| `SYS_003` | UNAUTHORIZED — Chưa đăng nhập / token sai |
| `SYS_004` | FORBIDDEN — Không có quyền |
| `SYS_005` | VALIDATION_ERROR — Sai input |
| `AUTH_001` | INVALID_CREDENTIALS — Email hoặc mật khẩu sai |
| `AUTH_002` | TENANT_SUSPENDED — Tenant bị khoá |
| `AUTH_003` | TOKEN_EXPIRED — Token hết hạn |
| `AUTH_004` | WRONG_PASSWORD — Mật khẩu hiện tại sai (change-password) |
| `TRIP_001` | TRIP_NOT_FOUND |
| `TRIP_002` | TRIP_NAME_INVALID — Tên trip chứa `/` |
| `ROUND_001` | ROUND_NOT_FOUND |
| `ROUND_002` | ROUND_STATUS_INVALID — Chuyển trạng thái không hợp lệ |
| `ROUND_003` | ROUND_CANCEL_FORBIDDEN — BusManager không được cancel chặng |
| `BUS_001` | BUS_NOT_FOUND |
| `BUS_002` | BUS_PLATE_DUPLICATE — Biển số đã tồn tại |
| `PAX_001` | PASSENGER_NOT_FOUND |
| `PAX_002` | PASSENGER_PHONE_INVALID — SĐT phải đúng 10 chữ số |
| `ALLOC_001` | ALLOCATION_NOT_FOUND |
| `ALLOC_002` | ALLOCATION_DUPLICATE — Hành khách đã được phân vào 1 xe trong chặng |
| `ALLOC_003` | ALLOCATION_MOVE_INVALID — Round không ở trạng thái PLANNED |
| `ALLOC_004` | BUS_CAPACITY_EXCEEDED — Vượt sức chứa xe |
| `ATT_001` | ATTENDANCE_NOT_FOUND |
| `ATT_002` | ATTENDANCE_SCOPE_DENIED — BusManager điểm danh ngoài phạm vi xe được giao |

---

## 7. WebSocket (không có trong Swagger)

Swagger chỉ document REST endpoints. WebSocket được test riêng:

- Namespace: `ws://localhost:3000/attendance`
- Auth: gửi token trong `auth` field khi connect
- Events:
  - Client → Server: `join-trip` `{ tripId }`
  - Server → Client: `attendance:updated` `{ tripId, roundId, busId, passengerName, status }`
  - Server → Client: `round:status-updated` `{ tripId, roundId, status }`
  - Server → Client: `broadcast:call` `{ tripId, message }`

Test WebSocket với Postman:
1. New Request → WebSocket
2. URL: `ws://localhost:3000/socket.io/?EIO=4&transport=websocket`
3. Add header: `Authorization: Bearer <token>`

---

## 8. Thêm @ApiProperty vào DTO (optional)

Hiện tại Swagger generate từ TypeScript types tự động (SwaggerModule + DocumentBuilder trong `apps/api/src/main.ts`).
Để thêm mô tả chi tiết hơn (example, description, enum, required), có thể dùng decorators:

```typescript
import { ApiProperty } from '@nestjs/swagger'

export class CreateTripDto {
  @ApiProperty({ example: 'Ha Noi - Sa Pa', description: 'Trip name (no "/" allowed)' })
  name: string

  @ApiProperty({ example: '2026-12-01' })
  startDate: string

  @ApiProperty({ example: '2026-12-03' })
  endDate: string
}
```

Trên controller có thể thêm `@ApiTags('Trips')`, `@ApiOperation({ summary: '...' })`, `@ApiBearerAuth()` để Swagger UI hiển thị đẹp hơn.
