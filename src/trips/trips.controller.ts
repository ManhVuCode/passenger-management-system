import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Lớp bảo vệ
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';

@Controller('trips')
@UseGuards(AuthGuard('jwt')) // <--- QUAN TRỌNG: Bắt buộc phải có Token mới vào được đây
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  create(@Body() createTripDto: CreateTripDto, @Req() req: any) {
    // req.user chính là thông tin User lấy từ Token (do JwtStrategy làm)
    return this.tripsService.create(createTripDto, req.user);
  }
}