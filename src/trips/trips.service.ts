import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Trip } from '../entities/trip.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { User } from '../entities/user.entity';
import { UserTenantRole } from '../entities/user-tenant-role.entity';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(UserTenantRole) private utrRepo: Repository<UserTenantRole>,
  ) {}

  async create(createTripDto: CreateTripDto, user: User) {
    // 1. Tìm xem User này thuộc Tenant nào (Lấy Tenant mặc định đầu tiên)
    // (Logic thực tế có thể phức tạp hơn nếu 1 người làm nhiều cty, nhưng tạm thời lấy cái đầu tiên)
    const linkage = await this.utrRepo.findOne({
      where: { userId: user.id, isActive: true },
      relations: ['tenant'],
    });

    if (!linkage || !linkage.tenant) {
      throw new NotFoundException('User này chưa thuộc về công ty (Tenant) nào cả!');
    }

    // 2. Tạo Trip
    const newTrip = this.tripRepo.create({
      ...createTripDto,
      tenant: linkage.tenant, // Gán Trip vào công ty của User
      status: 'Doing',
    });

    return await this.tripRepo.save(newTrip);
  }

  // Các hàm findAll, findOne... để sau làm tiếp
}