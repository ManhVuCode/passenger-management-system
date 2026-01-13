import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Trip } from './trip.entity';
import { User } from './user.entity';
import { Tenant } from './tenant.entity'; // <--- 1. Import thêm Tenant

@Entity('buses')
export class Bus {
  // --- Các cột cơ bản (Thay CustomBaseEntity bằng khai báo trực tiếp cho chuẩn) ---
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // --- 2. THÊM TENANT (Để fix lỗi Service & Bảo mật) ---
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // --- 3. Sửa Trip thành Nullable (Để tạo được xe nhập kho mà chưa cần chạy ngay) ---
  @Column({ name: 'trip_id', nullable: true })
  tripId: string;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  // --- 4. Cập nhật các trường khớp với DTO CreateBusDto ---
  
  // DTO đang dùng licensePlate, ta map nó vào đây
  @Column({ name: 'license_plate' }) 
  licensePlate: string; // Biển số xe (VD: 29B-123.45)

  @Column({ name: 'seat_count', default: 45 })
  seatCount: number;    // Số ghế

  @Column({ default: 'Active' })
  status: string;       // Trạng thái (Active, Maintenance...)

  // --- Các trường mở rộng (Giữ lại để dùng sau này) ---
  @Column({ name: 'bus_code', nullable: true }) 
  busCode: string; // Mã số xe trong đoàn (Xe 01, Xe 02...)

  @Column({ name: 'driver_name', nullable: true }) 
  driverName: string;

  @Column({ name: 'driver_tel', nullable: true }) 
  driverTel: string;

  @Column({ name: 'tour_guide_name', nullable: true }) 
  tourGuideName: string;

  @Column({ name: 'manager_id', nullable: true })
  managerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: User;

  @Column({ type: 'text', nullable: true })
  description: string;
}