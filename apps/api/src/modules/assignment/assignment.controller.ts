import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { AssignmentService } from './assignment.service'
import { AssignBusDto } from './dto/assign-bus.dto'
import { AssignBusManagerDto } from './dto/assign-bus-manager.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@pms/shared'

@Controller('trips/:tripId/rounds/:roundId/buses')
export class AssignmentController {
  constructor(private assignmentService: AssignmentService) {}

  @Get()
  @Roles(Role.ADMIN, Role.BUS_MANAGER)
  getRoundBuses(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.assignmentService.getRoundBusAssignments(tripId, roundId, user.tenantId)
  }

  @Post()
  @Roles(Role.ADMIN)
  assignBus(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @Body() dto: AssignBusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.assignmentService.assignBusToRound(tripId, roundId, user.tenantId, dto)
  }

  @Delete(':busId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeBus(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @Param('busId') busId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.assignmentService.removeBusFromRound(tripId, roundId, busId, user.tenantId)
  }

  @Post(':busId/manager')
  @Roles(Role.ADMIN)
  assignBusManager(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @Param('busId') busId: string,
    @Body() dto: AssignBusManagerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.assignmentService.assignBusManager(tripId, roundId, busId, user.tenantId, dto)
  }

  @Delete(':busId/manager')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeBusManager(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @Param('busId') busId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.assignmentService.removeBusManager(tripId, roundId, busId, user.tenantId)
  }
}
