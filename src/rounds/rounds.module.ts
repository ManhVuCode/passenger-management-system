import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoundsService } from './rounds.service';
import { RoundsController } from './rounds.controller';
import { Round } from '../entities/round.entity'; // Import bảng Round
import { Trip } from '../entities/trip.entity';   // Import bảng Trip (để kiểm tra trip có tồn tại ko)

@Module({
  imports: [TypeOrmModule.forFeature([Round, Trip])], // Đăng ký 2 bảng
  controllers: [RoundsController],
  providers: [RoundsService],
})
export class RoundsModule {}