import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoundsService } from './rounds.service';
import { CreateRoundDto } from './dto/create-round.dto';

@Controller('rounds')
@UseGuards(AuthGuard('jwt')) // Bảo vệ: Phải đăng nhập mới được tạo
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) {}

  @Post()
  create(@Body() createRoundDto: CreateRoundDto) {
    return this.roundsService.create(createRoundDto);
  }

  @Get(':tripId') // GET /rounds/f8bcb... (ID của Trip)
  findAllByTrip(@Param('tripId') tripId: string) {
    return this.roundsService.findAllByTrip(tripId);
  }
}