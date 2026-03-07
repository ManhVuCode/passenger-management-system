import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Lớp bảo vệ
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { CreateTripAssignmentDto } from './dto/create-trip-assignment.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Controller('trips')
@UseGuards(AuthGuard('jwt')) // <--- QUAN TRỌNG: Bắt buộc phải có Token mới vào được đây
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  create(@Body() createTripDto: CreateTripDto, @Req() req: any) {
    // req.user chính là thông tin User lấy từ Token (do JwtStrategy làm)
    return this.tripsService.create(createTripDto, req.user);
  }

  //Them endpoint Get:
  @Get() // GET /trips
  findAll(@Req() req: any) {
    // Truyền user lấy từ Token xuống service
    return this.tripsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.findOne(id, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTripDto, @Req() req: any) {
    return this.tripsService.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.remove(id, req.user);
  }

  @Post(':id/assignments')
  createAssignment(
    @Param('id') id: string,
    @Body() dto: CreateTripAssignmentDto,
    @Req() req: any,
  ) {
    return this.tripsService.createAssignment(id, dto, req.user);
  }

  @Get(':id/assignments')
  findAssignments(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.findAssignments(id, req.user);
  }
}
