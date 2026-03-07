import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { CustomBaseEntity } from './base.entity';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';

export enum TenantUserRole {
  TENANT_ADMIN = 'TENANT_ADMIN',
  STAFF = 'STAFF',
  DRIVER = 'DRIVER',
  ASSISTANT = 'ASSISTANT',
}

@Entity('user_tenant_roles') 
@Unique(['userId', 'tenantId']) // Một người chỉ có một vai trò chính trong một tenant
export class UserTenantRole extends CustomBaseEntity {
  
  // Liên kết đến User
  @Column({ name: 'user_id' }) 
  userId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) // Xóa User -> Xóa luôn dòng này
  @JoinColumn({ name: 'user_id' }) 
  user: User;

  // Liên kết đến Tenant (Có thể null nếu là SystemAdmin toàn hệ thống)
  @Column({ name: 'tenant_id', nullable: true }) 
  tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true }) 
  @JoinColumn({ name: 'tenant_id' }) 
  tenant: Tenant;

  @Column({
    name: 'role',
    type: 'varchar',
    default: TenantUserRole.STAFF,
  })
  role: TenantUserRole;

  @Column({ name: 'is_active', default: true }) 
  isActive: boolean; // Trạng thái kích hoạt
}
