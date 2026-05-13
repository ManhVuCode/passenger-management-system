import {
  Controller, Get, Post, Patch, Delete, Body,
  Param, HttpCode, HttpStatus, Res,
} from '@nestjs/common'
import { Response } from 'express'
import { PassengerService } from './passenger.service'
import { CreatePassengerDto } from './dto/create-passenger.dto'
import { UpdatePassengerDto } from './dto/update-passenger.dto'
import { BulkCreatePassengerDto } from './dto/bulk-create-passenger.dto'
import { SheetSyncDto } from './dto/sheet-sync.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@pms/shared'

@Controller('trips/:tripId/passengers')
export class PassengerController {
  constructor(private passengerService: PassengerService) {}

  @Get()
  @Roles(Role.ADMIN, Role.BUS_MANAGER)
  findAll(@Param('tripId') tripId: string, @CurrentUser() user: JwtPayload) {
    return this.passengerService.findAllByTrip(tripId, user.tenantId)
  }

  @Get('export/xlsx')
  @Roles(Role.ADMIN)
  async exportXlsx(
    @Param('tripId') tripId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.passengerService.exportXlsx(tripId, user.tenantId)
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="passengers-${tripId}.xlsx"`,
    )
    res.send(buffer)
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Param('tripId') tripId: string,
    @Body() dto: CreatePassengerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.passengerService.create(tripId, user.tenantId, dto)
  }

  @Post('bulk')
  @Roles(Role.ADMIN)
  bulkCreate(
    @Param('tripId') tripId: string,
    @Body() dto: BulkCreatePassengerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.passengerService.bulkCreate(tripId, user.tenantId, dto)
  }

  @Post('sheet-sync')
  @Roles(Role.ADMIN)
  sheetSync(
    @Param('tripId') tripId: string,
    @Body() dto: SheetSyncDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.passengerService.sheetSync(tripId, user.tenantId, dto)
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePassengerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.passengerService.update(id, user.tenantId, dto)
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.passengerService.remove(id, user.tenantId)
  }
}
