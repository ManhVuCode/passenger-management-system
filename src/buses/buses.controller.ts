import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BusesService } from './buses.service';
import { CreateBusDto } from './dto/create-bus.dto';

@Controller('buses')
@UseGuards(AuthGuard('jwt')) // Bảo vệ 2 lớp
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  @Post() // POST /buses (Thêm xe)
  create(@Body() createBusDto: CreateBusDto, @Req() req: any) {
    return this.busesService.create(createBusDto, req.user);
  }

  @Get() // GET /buses (Xem danh sách xe)
  findAll(@Req() req: any) {
    return this.busesService.findAll(req.user);
  }
}