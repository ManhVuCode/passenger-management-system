import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common'
import { AttendanceService } from './attendance.service'
import { MarkAttendanceDto } from './dto/mark-attendance.dto'
import { OverrideAttendanceDto } from './dto/override-attendance.dto'
import { RoundNoteDto } from './dto/round-note.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@pms/shared'

@Controller('trips/:tripId/rounds/:roundId')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get('buses/:busId/attendance')
  @Roles(Role.ADMIN, Role.BUS_MANAGER)
  getAttendance(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @Param('busId') busId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendanceService.getAttendanceByRoundBus(
      tripId, roundId, busId, user.tenantId, user,
    )
  }

  @Get('attendance/summary')
  @Roles(Role.ADMIN, Role.BUS_MANAGER)
  getSummary(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendanceService.getAttendanceSummary(tripId, roundId, user.tenantId)
  }

  @Post('buses/:busId/attendance')
  @Roles(Role.ADMIN, Role.BUS_MANAGER)
  markAttendance(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @Param('busId') busId: string,
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendanceService.markAttendance(
      tripId, roundId, busId, user.tenantId, dto, user,
    )
  }

  @Patch('attendance/:recordId/override')
  @Roles(Role.ADMIN)
  overrideAttendance(
    @Param('recordId') recordId: string,
    @Body() dto: OverrideAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendanceService.overrideAttendance(recordId, user.tenantId, dto, user)
  }

  @Patch('note')
  @Roles(Role.ADMIN)
  setRoundNote(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @Body() dto: RoundNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendanceService.setRoundNote(tripId, roundId, user.tenantId, dto)
  }
}
