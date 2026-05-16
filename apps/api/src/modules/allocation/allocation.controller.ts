import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common'
import { AllocationService } from './allocation.service'
import { AllocatePassengerDto } from './dto/allocate-passenger.dto'
import { MovePassengerDto } from './dto/move-passenger.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@pms/shared'

@Controller('trips/:tripId/rounds')
export class AllocationSummaryController {
  constructor(private allocationService: AllocationService) {}

  @Get('allocations-summary')
  @Roles(Role.ADMIN, Role.BUS_MANAGER)
  getAllocationsSummary(
    @Param('tripId') tripId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.allocationService.getAllocationsSummaryByTrip(tripId, user.tenantId)
  }
}

@Controller('trips/:tripId/rounds/:roundId')
export class AllocationController {
  constructor(private allocationService: AllocationService) {}

  @Get('allocations')
  @Roles(Role.ADMIN, Role.BUS_MANAGER)
  getAllocationsByRound(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.allocationService.getAllocationsByRound(tripId, roundId, user.tenantId)
  }

  @Get('buses/:busId/allocations')
  @Roles(Role.ADMIN, Role.BUS_MANAGER)
  getAllocations(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @Param('busId') busId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.allocationService.getAllocations(tripId, roundId, busId, user.tenantId)
  }

  @Post('buses/:busId/allocations')
  @Roles(Role.ADMIN)
  allocate(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @Param('busId') busId: string,
    @Body() dto: AllocatePassengerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.allocationService.allocate(tripId, roundId, user.tenantId, {
      ...dto,
      busId,
    })
  }

  @Delete('allocations/:assignmentId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAllocation(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.allocationService.removeAllocation(tripId, roundId, assignmentId, user.tenantId)
  }

  @Patch('allocations/:assignmentId/move')
  @Roles(Role.ADMIN)
  movePassenger(
    @Param('tripId') tripId: string,
    @Param('roundId') roundId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: MovePassengerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.allocationService.movePassenger(
      tripId, roundId, assignmentId, user.tenantId, dto,
    )
  }
}
