import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bus } from '../entities/bus.entity';
import { UserTenantRole } from '../entities/user-tenant-role.entity';
import { CreateBusDto } from './dto/create-bus.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class BusesService {
  constructor(
    @InjectRepository(Bus) private busRepo: Repository<Bus>,
    @InjectRepository(UserTenantRole) private utrRepo: Repository<UserTenantRole>,
  ) {}

  async create(dto: CreateBusDto, user: User) {
    // 1. Tìm Tenant của User hiện tại
    const linkage = await this.utrRepo.findOne({
      where: { userId: user.id, isActive: true },
      relations: ['tenant'],
    });

    if (!linkage || !linkage.tenant) {
      throw new BadRequestException('User chưa thuộc công ty nào!');
    }

    // 2. Tạo xe mới
    const newBus = this.busRepo.create({
      ...dto,
      tenant: linkage.tenant, // Gán xe vào công ty
      status: 'Active',       // Xe đang hoạt động
    });

    return await this.busRepo.save(newBus);
  }

  // Tiện tay làm luôn hàm lấy danh sách xe
  async findAll(user: User) {
    const linkage = await this.utrRepo.findOne({ where: { userId: user.id } });
    if (!linkage) return [];

    return await this.busRepo.find({
      where: { tenantId: linkage.tenantId },
      order: { createdAt: 'DESC' },
    });
  }
}