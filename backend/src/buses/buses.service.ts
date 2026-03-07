import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bus } from '../entities/bus.entity';
import { Trip } from '../entities/trip.entity';
import { UserTenantRole } from '../entities/user-tenant-role.entity';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';

interface CurrentAuthContext {
  id?: string;
  userId?: string;
  tenantId?: string;
  currentTenantId?: string;
}

@Injectable()
export class BusesService {
  constructor(
    @InjectRepository(Bus) private busRepo: Repository<Bus>,
    @InjectRepository(UserTenantRole) private utrRepo: Repository<UserTenantRole>,
    @InjectRepository(Trip) private tripRepo: Repository<Trip>, // <--- Inject thêm Trip Repo
  ) {}

  private resolveAuthContext(auth: CurrentAuthContext): {
    currentUserId: string;
    currentTenantId: string;
  } {
    const currentUserId = auth.userId ?? auth.id;
    const currentTenantId = auth.currentTenantId ?? auth.tenantId;

    if (!currentUserId || !currentTenantId) {
      throw new ForbiddenException('Thiếu ngữ cảnh user/tenant trong token');
    }

    return { currentUserId, currentTenantId };
  }

  private async ensureTenantAccess(userId: string, tenantId: string): Promise<UserTenantRole> {
    const linkage = await this.utrRepo.findOne({
      where: { userId, tenantId, isActive: true },
      relations: ['tenant'],
    });

    if (!linkage || !linkage.tenant) {
      throw new ForbiddenException('Bạn không có quyền truy cập tenant này');
    }

    return linkage;
  }

  async create(dto: CreateBusDto, auth: CurrentAuthContext) {
    const { currentUserId, currentTenantId } = this.resolveAuthContext(auth);
    const linkage = await this.ensureTenantAccess(currentUserId, currentTenantId);

    if (dto.tripId) {
      const trip = await this.tripRepo.findOne({
        where: { id: dto.tripId, tenantId: linkage.tenantId },
      });

      if (!trip) {
        throw new NotFoundException('Chuyến đi không tồn tại hoặc không thuộc công ty bạn!');
      }
    }

    // 3. Tạo xe
    const newBus = this.busRepo.create({
      ...dto,
      tenant: linkage.tenant,
      managerId: currentUserId,
      status: 'Active',
    });

    return await this.busRepo.save(newBus);
  }

  async findAll(auth: CurrentAuthContext) {
    const { currentUserId, currentTenantId } = this.resolveAuthContext(auth);
    await this.ensureTenantAccess(currentUserId, currentTenantId);

    return await this.busRepo
      .createQueryBuilder('bus')
      .leftJoinAndSelect('bus.trip', 'trip')
      .where('bus.tenantId = :tenantId', { tenantId: currentTenantId })
      .andWhere('bus.status != :inactive', { inactive: 'Inactive' })
      .orderBy('bus.createdAt', 'DESC')
      .getMany();
  }

  async findByTrip(tripId: string, auth: CurrentAuthContext) {
    const { currentUserId } = this.resolveAuthContext(auth);
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException('Chuyến đi không tồn tại');
    }
    await this.ensureTenantAccess(currentUserId, trip.tenantId);

    return await this.busRepo
      .createQueryBuilder('bus')
      .leftJoinAndSelect('bus.trip', 'trip')
      .leftJoinAndSelect('bus.manager', 'manager')
      .where('bus.tripId = :tripId', { tripId })
      .andWhere('bus.status != :inactive', { inactive: 'Inactive' })
      .orderBy('bus.busCode', 'ASC')
      .getMany();
  }

  async update(id: string, dto: UpdateBusDto, auth: CurrentAuthContext) {
    const { currentUserId } = this.resolveAuthContext(auth);
    const bus = await this.busRepo.findOne({ where: { id } });
    if (!bus) {
      throw new NotFoundException('Không tìm thấy xe');
    }

    await this.ensureTenantAccess(currentUserId, bus.tenantId);

    if (dto.tripId) {
      const trip = await this.tripRepo.findOne({
        where: { id: dto.tripId, tenantId: bus.tenantId },
      });
      if (!trip) {
        throw new BadRequestException('Trip không hợp lệ cho tenant này');
      }
    }

    Object.assign(bus, dto);
    return await this.busRepo.save(bus);
  }

  async remove(id: string, auth: CurrentAuthContext) {
    const { currentUserId } = this.resolveAuthContext(auth);
    const bus = await this.busRepo.findOne({ where: { id } });
    if (!bus) {
      throw new NotFoundException('Không tìm thấy xe');
    }

    await this.ensureTenantAccess(currentUserId, bus.tenantId);

    bus.status = 'Inactive';
    await this.busRepo.save(bus);
    return { message: 'Xóa xe thành công (soft delete)' };
  }
}
