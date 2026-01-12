//(Quản lý xe và ai là người phụ trách điểm danh xe đó)
import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { CustomBaseEntity } from './base.entity';
import { Trip } from './trip.entity';
import { User } from './user.entity';

@Entity('buses')
@Unique(['tripId', 'busCode']) // Trong 1 Trip, không được có 2 xe cùng mã số
export class Bus extends CustomBaseEntity {
  @Column({ name: 'trip_id' })
  tripId: string;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ name: 'bus_code' }) 
  busCode: string; // Mã xe (VD: Xe 01, Xe VIP)

  @Column({ name: 'registration_number', nullable: true })
  registrationNumber: string; // Biển số xe (29B-12345)

  // --- Thông tin tài xế & HDV (Lưu text đơn giản) ---
  @Column({ name: 'driver_name', nullable: true }) driverName: string;
  @Column({ name: 'driver_tel', nullable: true }) driverTel: string;
  @Column({ name: 'tour_guide_name', nullable: true }) tourGuideName: string;

  // --- Trưởng xe (Quan trọng: Người dùng App để điểm danh) ---
  @Column({ name: 'manager_id', nullable: true })
  managerId: string;

  @ManyToOne(() => User, { nullable: true }) // Không cascade user (Xóa xe không xóa người dùng)
  @JoinColumn({ name: 'manager_id' })
  manager: User; // User đóng vai trò BusManager

  @Column({ type: 'text', nullable: true })
  description: string;
}