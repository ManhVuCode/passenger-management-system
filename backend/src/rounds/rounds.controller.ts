import { Controller, Get, Post, Body, Param, UseGuards, Req, Patch, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoundsService } from './rounds.service';
import { CreateRoundDto } from './dto/create-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';

@Controller('rounds')
@UseGuards(AuthGuard('jwt')) // Bảo vệ bằng Token
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) {}

  @Post()
  create(@Body() dto: CreateRoundDto, @Req() req) {
    return this.roundsService.create(dto, req.user.userId);
  }

  @Get(':tripId') // GET /rounds/mã-chuyến-đi
  findByTrip(@Param('tripId') tripId: string) {
    return this.roundsService.findByTrip(tripId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoundDto, @Req() req: any) {
    return this.roundsService.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.roundsService.remove(id, req.user.userId);
  }
}
