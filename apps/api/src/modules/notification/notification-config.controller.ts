import { Controller, Get, Put, Body } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { UpdateAutoRulesDto } from './dto/update-auto-rules.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@pms/shared'

/** B4 — quy tắc tự động hóa theo từng tenant (R10: luôn giới hạn trong tenant của người gọi). */
@Controller('notification-config')
export class NotificationConfigController {
  constructor(private notificationService: NotificationService) {}

  @Get('auto-rules')
  @Roles(Role.ADMIN)
  getAutoRules(@CurrentUser() user: JwtPayload) {
    return this.notificationService.getAutoRules(user.tenantId)
  }

  @Put('auto-rules')
  @Roles(Role.ADMIN)
  updateAutoRules(@Body() dto: UpdateAutoRulesDto, @CurrentUser() user: JwtPayload) {
    return this.notificationService.updateAutoRules(user.tenantId, dto)
  }
}
