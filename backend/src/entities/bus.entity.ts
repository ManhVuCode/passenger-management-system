import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CustomBaseEntity } from './base.entity'; // Kế thừa cái này cho gọn
import { Trip } from './trip.entity';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';

@Entity('buses')
export class Bus extends CustomBaseEntity {
  // --- 1. QUAN TRỌNG: Xe thuộc Công ty nào? ---
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // --- 2. Xe đang chạy chuyến nào? (Có thể Null nếu xe đang nằm bãi) ---
  @Column({ name: 'trip_id', nullable: true })
  tripId: string;

  @ManyToOne(() => Trip, { onDelete: 'SET NULL', nullable: true }) // Xóa Trip thì xe vẫn còn (về bãi)
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  // --- 3. Thông tin xe ---
  @Column({ name: 'license_plate' }) 
  licensePlate: string; // VD: 29B-123.45

  @Column({ name: 'bus_code', nullable: true }) 
  busCode: string; // VD: Xe 01 (Số thứ tự trong đoàn)

  @Column({ name: 'seat_count', default: 45 })
  seatCount: number;

  @Column({ default: 'Active' })
  status: string; // Active, Maintaining (Bảo dưỡng), Assigned (Đang chạy)

  @Column({ type: 'text', nullable: true })
  description: string;

  // --- 4. Nhân sự đi theo xe ---
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
}