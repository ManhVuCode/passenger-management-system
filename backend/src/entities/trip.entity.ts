import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CustomBaseEntity } from '../entities/base.entity'; // Giả sử bạn đã có base entity chứa ID và CreatedAt
import { Tenant } from '../entities/tenant.entity';

@Entity('trips')
export class Trip extends CustomBaseEntity {
  @Column()
  name: string; // VD: Hà Nội - Đà Nẵng (3N2Đ)

  @Column({ default: 'Doing' }) // Mặc định là 'Doing' theo DBML
  status: string; 

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'start_date', type: 'timestamptz', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: true })
  endDate: Date;

  // --- Quan hệ Tenant (Bắt buộc) ---
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
