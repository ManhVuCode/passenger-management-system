import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { RoundService } from './round.service'
import { CreateRoundDto } from './dto/create-round.dto'
import { UpdateRoundStatusDto } from './dto/update-round-status.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@pms/shared'

@Controller('trips/:tripId/rounds')
export class RoundController {
  constructor(private roundService: RoundService) {}

  @Get()
  findAll(@Param('tripId') tripId: string, @CurrentUser() user: JwtPayload) {
    return this.roundService.findAllByTrip(tripId, user.tenantId)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.roundService.findOne(id, user.tenantId)
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Param('tripId') tripId: string,
    @Body() dto: CreateRoundDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roundService.create(tripId, user.tenantId, dto)
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.BUS_MANAGER)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRoundStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roundService.updateStatus(id, user.tenantId, dto, user)
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.roundService.remove(id, user.tenantId)
  }
}
