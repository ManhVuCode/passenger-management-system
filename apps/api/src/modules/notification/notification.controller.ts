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

  /** C5 — boarding-intent tally for this round's voice calls. */
  @Get('intent')
  @Roles(Role.ADMIN)
  intent(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationService.getVoiceIntent(tripId, user.tenantId, roundId)
  }

  /** C3 — simulate an IVR press-1 reply (intent only, never writes attendance). */
  @Post('rsvp')
  @Roles(Role.ADMIN)
  rsvp(@Body() dto: SimulateRsvpDto, @CurrentUser() user: JwtPayload) {
    return this.notificationService.setRsvpIntent(user.tenantId, dto.logId, dto.rsvp)
  }
}
