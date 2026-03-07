import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Round } from '../entities/round.entity';
import { Trip } from '../entities/trip.entity';
import { TenantUserRole, UserTenantRole } from '../entities/user-tenant-role.entity';
import { CreateRoundDto } from './dto/create-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';

@Injectable()
export class RoundsService {
  constructor(
    @InjectRepository(Round) private roundRepo: Repository<Round>,
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(UserTenantRole) private utrRepo: Repository<UserTenantRole>,
  ) {}

  private async ensureTenantAdminForTenant(userId: string, tenantId: string): Promise<void> {
    const linkage = await this.utrRepo.findOne({
      where: {
        userId,
        tenantId,
        role: TenantUserRole.TENANT_ADMIN,
        isActive: true,
      },
    });

    if (!linkage) {
      throw new ForbiddenException('Chỉ TENANT_ADMIN mới được phép thao tác');
    }
  }

  async create(dto: CreateRoundDto, userId: string) {
    // 1. Tìm Trip trước (Để biết Trip này thuộc gia đình nào)
    const trip = await this.tripRepo.findOne({
      where: { id: dto.tripId },
    });

    if (!trip) {
      throw new NotFoundException('Chuyến đi không tồn tại!');
    }

    // 2. [LOGIC MỚI] Kiểm tra xem User có quyền trong ĐÚNG công ty này không?
    // Thay vì tìm bừa, ta tìm đích danh: User này + Tenant của Trip này
    const linkage = await this.utrRepo.findOne({
      where: {
        userId: userId,
        tenantId: trip.tenantId, // <--- KHÓA CHẶT Ở ĐÂY
        isActive: true,
      },
      relations: ['tenant']
    });
    
    if (!linkage) {
      throw new ForbiddenException(`Bạn không phải nhân viên của công ty sở hữu chuyến đi này!`);
    }

    const departureTime = new Date(dto.departureTime);
    if (Number.isNaN(departureTime.getTime())) {
      throw new BadRequestException('departureTime không hợp lệ');
    }

    if (!trip.startDate || !trip.endDate) {
      throw new BadRequestException('Chuyến đi chưa có startDate/endDate để cấu hình round');
    }

    // departureTime phải nằm NGHIÊM NGẶT trong khoảng (startDate, endDate)
    if (departureTime <= trip.startDate || departureTime >= trip.endDate) {
      throw new BadRequestException('departureTime phải nằm trong khoảng thời gian của chuyến đi');
    }

    // 3. Nếu tìm thấy Linkage -> Có quyền -> Tạo Round
    const newRound = this.roundRepo.create({
      tripId: trip.id,
      name: dto.name,
      departureTime,
      sortOrder: dto.sortOrder ?? 0,
      trip: trip,
    });

    return await this.roundRepo.save(newRound);
  }

  async findByTrip(tripId: string) {
    return await this.roundRepo
      .createQueryBuilder('round')
      .where('round.tripId = :tripId', { tripId })
      .andWhere('round.status != :deletedStatus', { deletedStatus: 'Deleted' })
      .orderBy('round.departureTime', 'ASC')
      .getMany();
  }

  async update(id: string, dto: UpdateRoundDto, userId: string) {
    const round = await this.roundRepo.findOne({ where: { id } });
    if (!round) {
      throw new NotFoundException('Round không tồn tại');
    }

    const trip = await this.tripRepo.findOne({ where: { id: round.tripId } });
    if (!trip) {
      throw new NotFoundException('Trip của round không tồn tại');
    }

    await this.ensureTenantAdminForTenant(userId, trip.tenantId);

    if (dto.name !== undefined) {
      round.name = dto.name;
    }

    if (dto.departureTime !== undefined) {
      const departureTime = new Date(dto.departureTime);
      if (Number.isNaN(departureTime.getTime())) {
        throw new BadRequestException('departureTime không hợp lệ');
      }

      if (!trip.startDate || !trip.endDate) {
        throw new BadRequestException('Chuyến đi chưa có startDate/endDate để cấu hình round');
      }

      if (departureTime <= trip.startDate || departureTime >= trip.endDate) {
        throw new BadRequestException('departureTime phải nằm trong khoảng thời gian của chuyến đi');
      }

      round.departureTime = departureTime;
    }

    return await this.roundRepo.save(round);
  }

  async remove(id: string, userId: string) {
    const round = await this.roundRepo.findOne({ where: { id } });
    if (!round) {
      throw new NotFoundException('Round không tồn tại');
    }

    const trip = await this.tripRepo.findOne({ where: { id: round.tripId } });
    if (!trip) {
      throw new NotFoundException('Trip của round không tồn tại');
    }

    await this.ensureTenantAdminForTenant(userId, trip.tenantId);
    round.status = 'Deleted';
    await this.roundRepo.save(round);
    return { message: 'Xóa round thành công (soft delete)' };
  }
}
