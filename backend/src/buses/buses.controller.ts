import { Controller, Get, Post, Body, Param, UseGuards, Req, Patch, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BusesService } from './buses.service';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';

@Controller('buses')
@UseGuards(AuthGuard('jwt'))
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  @Post()
  create(@Body() dto: CreateBusDto, @Req() req) {
    return this.busesService.create(dto, req.user);
  }

  @Get()
  findAll(@Req() req) {
    return this.busesService.findAll(req.user);
  }

  @Get('trip/:tripId')
  findByTrip(@Param('tripId') tripId: string, @Req() req) {
    return this.busesService.findByTrip(tripId, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBusDto, @Req() req) {
    return this.busesService.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.busesService.remove(id, req.user);
  }
}
