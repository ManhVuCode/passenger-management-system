import { Controller, Get, Param, Query } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@pms/shared'

@Controller('trips/:tripId/notifications')
export class NotificationHistoryController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @Roles(Role.ADMIN)
  history(
    @Param('tripId') tripId: string,
    @CurrentUser() user: JwtPayload,
    @Query('roundId') roundId?: string,
    @Query('channel') channel?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.getHistory(tripId, user.tenantId, {
      roundId,
      channel,
      limit: limit ? Number(limit) : undefined,
    })
  }
}
