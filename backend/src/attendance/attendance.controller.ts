import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Controller('attendance')
@UseGuards(AuthGuard('jwt')) // Bảo vệ toàn bộ API
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // 1. API Điểm danh (Check-in/Check-out)
  // POST: http://localhost:3000/attendance
  @Post()
  checkIn(@Body() dto: CreateAttendanceDto, @Req() req) {
    return this.attendanceService.checkIn(dto, req.user.userId);
  }

  // 2. API Xem danh sách điểm danh của 1 chặng
  // GET: http://localhost:3000/attendance/round/:roundId
  @Get('round/:roundId')
  findByRound(@Param('roundId') roundId: string) {
    return this.attendanceService.findByRound(roundId);
  }
}

