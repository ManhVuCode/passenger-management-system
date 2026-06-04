import { Controller, Post, Get, Body, Param } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { SendNotificationDto } from './dto/send-notification.dto'
import { SimulateRsvpDto } from './dto/simulate-rsvp.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@pms/shared'

@Controller('trips/:tripId/rounds/:roundId/notify')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post()
  @Roles(Role.ADMIN)
  send(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @Body() dto: SendNotificationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationService.sendToRound(tripId, roundId, user.tenantId, dto)
  }

  /** C5 — thống kê ý định lên xe từ các cuộc gọi thoại của round này. */
  @Get('intent')
  @Roles(Role.ADMIN)
  intent(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationService.getVoiceIntent(tripId, user.tenantId, roundId)
  }

  /** C3 — mô phỏng phản hồi nhấn phím 1 trên IVR (chỉ ghi ý định, không bao giờ ghi điểm danh). */
  @Post('rsvp')
  @Roles(Role.ADMIN)
  rsvp(@Body() dto: SimulateRsvpDto, @CurrentUser() user: JwtPayload) {
    return this.notificationService.setRsvpIntent(user.tenantId, dto.logId, dto.rsvp)
  }
}
