import { Controller, Get, Put, Delete, Body } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { UpdateAutoRulesDto } from './dto/update-auto-rules.dto'
import { SetTelegramConfigDto } from './dto/set-telegram-config.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@pms/shared'

/** B4/D1 — cấu hình thông báo theo từng tenant (R10: luôn giới hạn trong tenant của người gọi). */
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

  /** D1 — trạng thái bot Telegram của tenant + link đăng ký. */
  @Get('telegram')
  @Roles(Role.ADMIN)
  getTelegram(@CurrentUser() user: JwtPayload) {
    return this.notificationService.getTelegramConfig(user.tenantId)
  }

  /** D1 — lưu bot token (xác thực qua getMe) + bật poller. */
  @Put('telegram')
  @Roles(Role.ADMIN)
  setTelegram(@Body() dto: SetTelegramConfigDto, @CurrentUser() user: JwtPayload) {
    return this.notificationService.setTelegramConfig(user.tenantId, dto.botToken)
  }

  /** D1 — gỡ bot token + dừng poller. */
  @Delete('telegram')
  @Roles(Role.ADMIN)
  clearTelegram(@CurrentUser() user: JwtPayload) {
    return this.notificationService.clearTelegramConfig(user.tenantId)
  }
}
