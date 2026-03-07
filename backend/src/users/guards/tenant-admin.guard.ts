import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantUserRole, UserTenantRole } from '../../entities/user-tenant-role.entity';

@Injectable()
export class TenantAdminGuard implements CanActivate {
  constructor(
    @InjectRepository(UserTenantRole)
    private readonly utrRepo: Repository<UserTenantRole>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as {
      id?: string;
      userId?: string;
      tenantId?: string;
      currentTenantId?: string;
    };

    const currentUserId = user?.userId ?? user?.id;
    const currentTenantId = user?.currentTenantId ?? user?.tenantId;

    if (!currentUserId || !currentTenantId) {
      throw new ForbiddenException('Thiếu ngữ cảnh tenant trong token');
    }

    const linkage = await this.utrRepo.findOne({
      where: {
        userId: currentUserId,
        tenantId: currentTenantId,
        role: TenantUserRole.TENANT_ADMIN,
        isActive: true,
      },
    });

    if (!linkage) {
      throw new ForbiddenException('Chỉ TENANT_ADMIN mới có quyền quản lý nhân sự');
    }

    request.currentTenantId = currentTenantId;
    request.currentUserId = currentUserId;
    return true;
  }
}
