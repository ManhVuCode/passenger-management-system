import { Controller, Get } from '@nestjs/common'
import { AttendanceService } from '../attendance/attendance.service'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@pms/shared'

@Controller('me')
export class MeController {
  constructor(private attendanceService: AttendanceService) {}

  @Get('assignments')
  @Roles(Role.BUS_MANAGER, Role.ADMIN)
  getMyAssignments(@CurrentUser() user: JwtPayload) {
    return this.attendanceService.getMyAssignments(user.userId, user.tenantId)
  }
}
