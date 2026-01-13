import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Round } from '../entities/round.entity';
import { Trip } from '../entities/trip.entity';
import { CreateRoundDto } from './dto/create-round.dto';

@Injectable()
export class RoundsService {
  constructor(
    @InjectRepository(Round) private roundRepo: Repository<Round>,
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
  ) {}

  async create(dto: CreateRoundDto) {
    // 1. Kiểm tra Trip có tồn tại không
    const trip = await this.tripRepo.findOne({ where: { id: dto.tripId } });
    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến đi (Trip) này!');
    }

    // 2. Tạo Round mới
    const newRound = this.roundRepo.create({
      trip: trip,      // Gán vào Trip tìm được
      name: dto.name,
      timeText: dto.timeText,
      status: 'Doing',
    });

    return await this.roundRepo.save(newRound);
  }
  async findAllByTrip(tripId: string) {
    return await this.roundRepo.find({
      where: { trip: { id: tripId } }, // Lọc theo tripId
      order: { timeText: 'ASC' },      // Sắp xếp theo thời gian (nếu muốn)
    });
  }
}