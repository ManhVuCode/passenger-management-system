import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { BusService } from './bus.service'
import { CreateBusDto } from './dto/create-bus.dto'
import { UpdateBusDto } from './dto/update-bus.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@pms/shared'

@Controller('buses')
export class BusController {
  constructor(private busService: BusService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.busService.findAll(user.tenantId)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.busService.findOne(id, user.tenantId)
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateBusDto, @CurrentUser() user: JwtPayload) {
    return this.busService.create(user.tenantId, dto)
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateBusDto, @CurrentUser() user: JwtPayload) {
    return this.busService.update(id, user.tenantId, dto)
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.busService.remove(id, user.tenantId)
  }
}
