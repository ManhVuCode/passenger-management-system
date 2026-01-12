//(Quản lý các tour, chuyến đi của Tenant
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CustomBaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';

@Entity('trips')
export class Trip extends CustomBaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  // Liên kết: Trip thuộc về 1 Tenant cụ thể
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  name: string; // Tên chuyến đi (VD: Hà Nội - Hạ Long 2N1Đ)

  @Column({ default: 'Doing' })
  status: string; // Trạng thái: Doing (Đang chạy), Done (Đã xong)

  @Column({ type: 'text', nullable: true })
  description: string;
}