import { Controller, Post, Body, Param } from '@nestjs/common'
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
}
