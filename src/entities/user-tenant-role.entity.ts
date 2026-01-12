import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { CustomBaseEntity } from './base.entity';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';
import { Role } from './role.entity';

@Entity('user_tenant_roles') 
@Unique(['userId', 'tenantId', 'roleId']) // Một người, ở 1 cty, chỉ có 1 quyền duy nhất
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

  // Liên kết đến Role
  @Column({ name: 'role_id' }) 
  roleId: string;
  @ManyToOne(() => Role, { onDelete: 'CASCADE' }) 
  @JoinColumn({ name: 'role_id' }) 
  role: Role;

  @Column({ name: 'is_active', default: true }) 
  isActive: boolean; // Trạng thái kích hoạt
}