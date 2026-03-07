//(Danh sách khách hàng của Tenant)
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CustomBaseEntity } from './base.entity'; // Kế thừa cho gọn
import { Trip } from './trip.entity';
import { Bus } from './bus.entity';
import { Tenant } from './tenant.entity';

@Entity('passengers')
export class Passenger extends CustomBaseEntity {
  // --- 1. Thông tin cá nhân ---
  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  // --- 2. Gắn với Trip nào? (QUAN TRỌNG) ---
  @Column({ name: 'trip_id' })
  tripId: string;

  // onDelete: 'CASCADE' -> Rất chuẩn với yêu cầu của bạn.
  // Khi xóa Trip, toàn bộ khách trong chuyến đó sẽ bay màu theo.
  @ManyToOne(() => Trip, { onDelete: 'CASCADE' }) 
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  // --- 3. Gắn với Xe nào? ---
  @Column({ name: 'bus_id', nullable: true })
  busId: string;

  @ManyToOne(() => Bus, { nullable: true, onDelete: 'SET NULL' }) // Xóa xe thì khách bị "đá" ra khỏi xe chứ ko bị xóa
  @JoinColumn({ name: 'bus_id' })
  bus: Bus;

  // --- 4. Cần thêm Tenant để bảo mật ---
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ default: 'Confirmed' })
  status: string;
}