import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { TripService } from './trip.service'
import { CreateTripDto } from './dto/create-trip.dto'
import { UpdateTripDto } from './dto/update-trip.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@pms/shared'

@Controller('trips')
export class TripController {
  constructor(private tripService: TripService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.tripService.findAll(user.tenantId)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tripService.findOne(id, user.tenantId)
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTripDto, @CurrentUser() user: JwtPayload) {
    return this.tripService.create(user.tenantId, dto)
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tripService.update(id, user.tenantId, dto)
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tripService.remove(id, user.tenantId)
  }
}
