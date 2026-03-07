import { Controller, Get, Post, Body, Param, UseGuards, Req, Patch, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PassengersService } from './passengers.service';
import { CreatePassengerDto } from './dto/create-passenger.dto';
import { UpdatePassengerDto } from './dto/update-passenger.dto';

@Controller('passengers')
@UseGuards(AuthGuard('jwt'))
export class PassengersController {
  constructor(private readonly passengersService: PassengersService) {}

  @Post()
  create(@Body() dto: CreatePassengerDto, @Req() req) {
    // SỬA: Truyền thêm userId
    return this.passengersService.create(dto, req.user.userId);
  }

  @Get('trip/:tripId')
  findByTrip(@Param('tripId') tripId: string, @Req() req) {
    // SỬA: Truyền thêm userId
    return this.passengersService.findByTrip(tripId, req.user.userId);
  }

  // API gán xe (Bạn có thể dùng @Patch hoặc @Post tùy ý)
  @Patch(':id/assign-bus') 
  assignBus(
    @Param('id') passengerId: string,
    @Body('busId') busId: string,
    @Req() req
  ) {
    // SỬA: Truyền thêm userId
    return this.passengersService.assignBus(passengerId, busId, req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') passengerId: string, @Body() dto: UpdatePassengerDto, @Req() req: any) {
    return this.passengersService.update(passengerId, dto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') passengerId: string, @Req() req: any) {
    return this.passengersService.remove(passengerId, req.user.userId);
  }
}
