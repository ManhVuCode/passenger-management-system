import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) return true

    const paramTenantId = request.params?.tenantId || request.body?.tenantId
    if (paramTenantId && paramTenantId !== user.tenantId) {
      throw new ForbiddenException('Cross-tenant access denied')
    }
    return true
  }
}
