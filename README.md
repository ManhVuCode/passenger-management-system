# GR2 – Passenger Multi-Manager Attendance System

Bản tóm tắt & trạng thái hiện tại của dự án.

## 1) Mục tiêu dự án
Xây dựng website quản lý tour/xe/điểm danh hành khách theo mô hình multi-tenant + multi-manager, có realtime attendance.

Hệ thống phục vụ:
- Quản lý tour (trip)
- Quản lý lượt/điểm dừng (round)
- Quản lý xe (bus)
- Quản lý hành khách (passenger)
- Điểm danh đi / về, ghi chú bất thường
- Cập nhật realtime cho nhiều người cùng xem

## 2) Actors (Tác nhân hệ thống)
### 2.1) SystemAdmin / SuperAdmin
- Quản trị toàn hệ thống
- Quản lý: Users, Roles, Tenants (tổ chức)

### 2.2) Admin (theo Tenant)
- Chỉ hoạt động trong 1 tenant
- Quản lý: Trips, Rounds, Buses, Passengers
- Import / Export Excel
- Gán BusManager

### 2.3) BusManager (Trưởng xe / HDV)
- Chỉ thấy xe/trip được gán
- Thực hiện: Điểm danh hành khách, Check-in / Check-out, Ghi chú bất thường
- Xem số điện thoại / Zalo / Facebook để liên hệ

## 3) Công nghệ sử dụng (đã chốt)
### 3.1) Backend
- NodeJS + TypeScript
- NestJS (framework backend)
- Prisma ORM
- PostgreSQL
- JWT (authentication)
- Swagger (API docs)

### 3.2) Frontend
- ReactJS + TypeScript
- Vite
- UI cho:
  - Admin (desktop)
  - BusManager (mobile portrait)
- Option: PWA

### 3.3) Realtime
- MQTT
- Giao thức: WebSocket (wss)
- Backend publish sự kiện
- Frontend subscribe realtime

## 4) Tài nguyên được cấp (đã xác nhận)
### 4.1) MQTT Server
- MQTT: mqtt://mqtt.toolhub.app:1883
- WebSocket: ws://mqtt.toolhub.app:8083
- Secure WS: wss://mqtt.toolhub.app:8084
- Account: manhvd
- Password: 20226054

### 4.2) PostgreSQL Database
- Host: postgresql.toolhub.app
- Port: 5432
- Database: PassengerMgnt_ManhVD
- Username: manhvd
- Password: 20226054
- Schema: public

## 5) Database Design (đã hoàn tất ở mức thiết kế)
### 5.1) Tổng số bảng
- 10 bảng (tối thiểu đủ chạy toàn bộ use case)

### 5.2) Danh sách bảng & ý nghĩa
| Bảng | Mục đích |
| --- | --- |
| tenants | Tổ chức (SOICT, Viettravel…) |
| users | Người dùng hệ thống |
| roles | SystemAdmin / Admin / BusManager / Disable |
| user_tenant_roles | Gán user + role + tenant (multi-tenant) |
| trips | Tour / chuyến |
| rounds | Lượt / điểm dừng trong trip |
| buses | Xe trong trip |
| passengers | Hành khách |
| trip_passengers | Passenger ↔ Trip (many-to-many, bắt buộc) |
| attendance_records | Điểm danh (check-in / check-out) |

### 5.3) Điểm quan trọng
- Passenger có thể thuộc nhiều trip.
- Attendance không gắn trực tiếp passenger, mà gắn trip_passenger để tránh nhập nhằng dữ liệu.

### 5.4) ERD
- DBML: `taxidriver.dbml`
- DBDiagram: `taxidriver.dbdiagram`

## 6) Trạng thái hiện tại của dự án (CHECKPOINT)
### 6.1) Đã hoàn thành
- Phân tích nghiệp vụ
- Chốt Use Case
- Chốt Actors
- Chốt công nghệ
- Thiết kế ERD (logic chuẩn)
- Hiểu rõ backend ≠ frontend
- Hiểu lý do tạo cấu trúc thủ công

### 6.2) Đang ở bước
- Bước 0 / Bước 1: Khởi tạo cấu trúc project trên Windows
- Quyết định: KHÔNG dùng WSL; dùng Windows PowerShell / CMD
- Đang tạo: `backend/` (NestJS), `frontend/` (React)

### 6.3) Chưa làm
- Chưa tạo DB thật trên PostgreSQL
- Chưa chạy SQL
- Chưa dùng Prisma
- Chưa code API
- Chưa code MQTT
- Chưa code UI

## 7) Quy trình chuẩn sẽ tiếp tục (để bạn nhớ mạch)
Thứ tự ĐÚNG – không nhảy bước:
1. Tạo backend + frontend chạy được
2. Viết SQL PostgreSQL (DDL)
3. Chạy SQL bằng PostgreSQL extension trong VSCode
4. Kiểm tra DB bằng query
5. Prisma db pull (sync DB → code)
6. PrismaModule + NestJS
7. Auth + Role + Tenant guard
8. CRUD Admin
9. Attendance API
10. MQTT realtime
11. React UI
12. Demo & hoàn thiện

---
Nếu cần, có thể tách thêm tài liệu: `PROJECT_SPEC.md` và `TECH_CONTEXT.md`.
