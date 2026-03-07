import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Trip } from '../entities/trip.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { User } from '../entities/user.entity';
import {
  TenantUserRole,
  UserTenantRole,
} from '../entities/user-tenant-role.entity';
import { TripAssignment } from '../entities/trip-assignment.entity';
import { Bus } from '../entities/bus.entity';
import { CreateTripAssignmentDto } from './dto/create-trip-assignment.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { UpdateTripAssignmentDto } from './dto/update-trip-assignment.dto';

interface CurrentAuthContext {
  id?: string;
  userId?: string;
  tenantId?: string;
  currentTenantId?: string;
  role?: TenantUserRole;
}

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(UserTenantRole) private utrRepo: Repository<UserTenantRole>,
    @InjectRepository(TripAssignment)
    private tripAssignmentRepo: Repository<TripAssignment>,
    @InjectRepository(Bus) private busRepo: Repository<Bus>,
  ) {}

  private resolveUserId(auth: CurrentAuthContext): string {
    const userId = auth.userId ?? auth.id;
    if (!userId) {
      throw new ForbiddenException('Thiếu user trong token');
    }
    return userId;
  }

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

  private async ensureTripTenantAccess(tripId: string, userId: string): Promise<Trip> {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException('Chuyến đi không tồn tại');
    }

    const linkage = await this.utrRepo.findOne({
      where: { userId, tenantId: trip.tenantId, isActive: true },
    });

    if (!linkage) {
      throw new ForbiddenException('Không có quyền truy cập chuyến đi này');
    }

    return trip;
  }

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
  async findAll(user: User) {
    // 1. Xác định User thuộc công ty (Tenant) nào
    const linkage = await this.utrRepo.findOne({
      where: { userId: user.id, isActive: true },
    });

    if (!linkage) {
      return []; // Nếu không thuộc cty nào thì trả về rỗng
    }

    // 2. Tìm tất cả Trip của Tenant đó
    return await this.tripRepo
      .createQueryBuilder('trip')
      .where('trip.tenantId = :tenantId', { tenantId: linkage.tenantId })
      .andWhere('trip.status != :deletedStatus', { deletedStatus: 'Deleted' })
      .orderBy('trip.createdAt', 'DESC')
      .getMany();
  }

  async findOne(tripId: string, auth: CurrentAuthContext) {
    const userId = this.resolveUserId(auth);
    const trip = await this.ensureTripTenantAccess(tripId, userId);
    if (trip.status === 'Deleted') {
      throw new NotFoundException('Chuyến đi không tồn tại');
    }
    return trip;
  }

  async createAssignment(tripId: string, dto: CreateTripAssignmentDto, user: User) {
    const trip = await this.ensureTripTenantAccess(tripId, user.id);

    const bus = await this.busRepo.findOne({
      where: { id: dto.busId, tenantId: trip.tenantId },
    });
    if (!bus || bus.status === 'Inactive') {
      throw new BadRequestException('Bus không hợp lệ hoặc không còn hoạt động');
    }

    const driverLinkage = await this.utrRepo.findOne({
      where: {
        userId: dto.driverId,
        tenantId: trip.tenantId,
        role: TenantUserRole.DRIVER,
        isActive: true,
      },
      relations: ['user'],
    });

    if (!driverLinkage?.user) {
      throw new BadRequestException('Driver không hợp lệ cho tenant này');
    }

    const duplicated = await this.tripAssignmentRepo.findOne({
      where: { tripId: trip.id, busId: bus.id },
    });
    if (duplicated) {
      throw new BadRequestException('Bus này đã được gán cho chuyến đi');
    }

    const assignment = this.tripAssignmentRepo.create({
      tripId: trip.id,
      busId: bus.id,
      driverId: driverLinkage.user.id,
    });

    await this.tripAssignmentRepo.save(assignment);
    return await this.tripAssignmentRepo.findOne({
      where: { id: assignment.id },
      relations: ['bus', 'driver', 'trip'],
    });
  }

  async findAssignments(tripId: string, user: User) {
    const trip = await this.ensureTripTenantAccess(tripId, user.id);
    return await this.tripAssignmentRepo.find({
      where: { tripId: trip.id },
      relations: ['bus', 'driver', 'trip'],
      order: { createdAt: 'ASC' },
    });
  }

  async update(tripId: string, dto: UpdateTripDto, auth: CurrentAuthContext) {
    const userId = this.resolveUserId(auth);
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException('Chuyến đi không tồn tại');
    }

    await this.ensureTenantAdminForTenant(userId, trip.tenantId);

    if (dto.name !== undefined) trip.name = dto.name;
    if (dto.status !== undefined) trip.status = dto.status;
    if (dto.startDate !== undefined) trip.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) trip.endDate = new Date(dto.endDate);

    return await this.tripRepo.save(trip);
  }

  async remove(tripId: string, auth: CurrentAuthContext) {
    const userId = this.resolveUserId(auth);
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException('Chuyến đi không tồn tại');
    }

    await this.ensureTenantAdminForTenant(userId, trip.tenantId);
    trip.status = 'Deleted';
    await this.tripRepo.save(trip);
    return { message: 'Xóa chuyến đi thành công (soft delete)' };
  }

  async updateAssignment(assignmentId: string, dto: UpdateTripAssignmentDto, auth: CurrentAuthContext) {
    const userId = this.resolveUserId(auth);
    const assignment = await this.tripAssignmentRepo.findOne({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('Không tìm thấy assignment');
    }

    const trip = await this.tripRepo.findOne({ where: { id: assignment.tripId } });
    if (!trip) {
      throw new NotFoundException('Trip của assignment không tồn tại');
    }

    await this.ensureTenantAdminForTenant(userId, trip.tenantId);

    if (dto.busId !== undefined) {
      const bus = await this.busRepo.findOne({
        where: { id: dto.busId, tenantId: trip.tenantId },
      });
      if (!bus || bus.status === 'Inactive') {
        throw new BadRequestException('Bus không hợp lệ hoặc không còn hoạt động');
      }

      const duplicate = await this.tripAssignmentRepo.findOne({
        where: { tripId: trip.id, busId: bus.id },
      });
      if (duplicate && duplicate.id !== assignment.id) {
        throw new BadRequestException('Bus này đã được gán cho chuyến đi');
      }

      assignment.busId = bus.id;
    }

    if (dto.driverId !== undefined) {
      const driverLinkage = await this.utrRepo.findOne({
        where: {
          userId: dto.driverId,
          tenantId: trip.tenantId,
          role: TenantUserRole.DRIVER,
          isActive: true,
        },
      });
      if (!driverLinkage) {
        throw new BadRequestException('Driver không hợp lệ cho tenant này');
      }

      assignment.driverId = dto.driverId;
    }

    await this.tripAssignmentRepo.save(assignment);
    return await this.tripAssignmentRepo.findOne({
      where: { id: assignment.id },
      relations: ['bus', 'driver', 'trip'],
    });
  }

  async removeAssignment(assignmentId: string, auth: CurrentAuthContext) {
    const userId = this.resolveUserId(auth);
    const assignment = await this.tripAssignmentRepo.findOne({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('Không tìm thấy assignment');
    }

    const trip = await this.tripRepo.findOne({ where: { id: assignment.tripId } });
    if (!trip) {
      throw new NotFoundException('Trip của assignment không tồn tại');
    }

    await this.ensureTenantAdminForTenant(userId, trip.tenantId);
    await this.tripAssignmentRepo.delete(assignment.id);
    return { message: 'Xóa assignment thành công' };
  }
}
