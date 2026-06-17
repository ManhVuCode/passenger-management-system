import { Controller, Post, Get, Body, Param } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { SendNotificationDto } from './dto/send-notification.dto'
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

  /** Số hành khách của round có / không có email — để UI cảnh báo trước khi gửi email. */
  @Get('email-recipients')
  @Roles(Role.ADMIN)
  emailRecipients(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationService.getEmailEligibility(tripId, roundId, user.tenantId)
  }
}
