//(Danh sách khách hàng của Tenant)
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CustomBaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';

@Entity('passengers')
export class Passenger extends CustomBaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true }) tel: string;
  @Column({ nullable: true }) zalo: string;
  @Column({ nullable: true }) facebook: string;

  @Column({ type: 'text', nullable: true })
  note: string;
}