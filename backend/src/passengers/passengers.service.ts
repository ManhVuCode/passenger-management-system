import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Passenger } from '../entities/passenger.entity';
import { Trip } from '../entities/trip.entity';
import { Bus } from '../entities/bus.entity';
import { TenantUserRole, UserTenantRole } from '../entities/user-tenant-role.entity';
import { CreatePassengerDto } from './dto/create-passenger.dto';
import { UpdatePassengerDto } from './dto/update-passenger.dto';

@Injectable()
export class PassengersService {
  constructor(
    @InjectRepository(Passenger) private passRepo: Repository<Passenger>,
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(Bus) private busRepo: Repository<Bus>,
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

  private async getTenantLinkage(userId: string, tenantId: string): Promise<UserTenantRole> {
    const linkage = await this.utrRepo.findOne({
      where: { userId, tenantId, isActive: true },
    });

    if (!linkage) {
      throw new ForbiddenException('Bạn không có quyền thao tác dữ liệu tenant này');
    }

    return linkage;
  }

  // 1. Tạo hành khách
  async create(dto: CreatePassengerDto, userId: string) {
    // B1: Tìm Trip
    const trip = await this.tripRepo.findOne({ 
      where: { id: dto.tripId } 
    });
    if (!trip) throw new NotFoundException('Chuyến đi không tồn tại!');

    // B2: Check quyền Tenant
    const linkage = await this.utrRepo.findOne({
      where: { 
        userId, 
        tenantId: trip.tenantId, 
        isActive: true 
      },
      relations: ['tenant'],
    });

    if (!linkage) {
       throw new ForbiddenException('Bạn không có quyền thêm khách vào chuyến của công ty này!');
    }

    // B3: Xử lý Bus (Logic chuẩn TypeScript)
    // Khai báo là undefined để hàm .create() không bị lỗi
    let bus: Bus | undefined = undefined; 

    if (dto.busId) {
      // Dùng biến tạm foundBus để nhận kết quả từ DB (có thể là null)
      const foundBus = await this.busRepo.findOne({
        where: { id: dto.busId, tenantId: trip.tenantId } 
      });

      if (!foundBus) {
        throw new BadRequestException('Xe không hợp lệ hoặc không thuộc công ty này!');
      }

      // Nếu tìm thấy, gán vào biến chính
      bus = foundBus;
    }

    // B4: Lưu
    const newPass = this.passRepo.create({
      ...dto,
      tenant: linkage.tenant, 
      trip: trip,
      bus: bus, // Lúc này bus chỉ có thể là Bus hoặc undefined -> TypeORM chịu ngay
      status: 'Confirmed'
    });

    return await this.passRepo.save(newPass);
  }
  
  // 2. Lấy danh sách khách theo Trip
  async findByTrip(tripId: string, userId: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Không tìm thấy chuyến đi!');

    const linkage = await this.utrRepo.findOne({ 
      where: { userId, tenantId: trip.tenantId } 
    });
    if (!linkage) throw new ForbiddenException('Không có quyền xem chuyến này!');

    return await this.passRepo
      .createQueryBuilder('passenger')
      .leftJoinAndSelect('passenger.bus', 'bus')
      .where('passenger.tripId = :tripId', { tripId })
      .andWhere('passenger.status != :deletedStatus', { deletedStatus: 'Deleted' })
      .orderBy('passenger.fullName', 'ASC')
      .getMany();
  }

  // 3. Xếp khách vào xe
  async assignBus(passengerId: string, busId: string, userId: string) {
    const passenger = await this.passRepo.findOne({ where: { id: passengerId } });
    if (!passenger) throw new NotFoundException('Không tìm thấy hành khách!');

    const linkage = await this.utrRepo.findOne({ 
      where: { userId, tenantId: passenger.tenantId } 
    });
    if (!linkage) throw new ForbiddenException('Không có quyền sửa đổi khách này!');

    const bus = await this.busRepo.findOne({ 
      where: { id: busId, tenantId: passenger.tenantId } 
    });
    if (!bus) throw new NotFoundException('Xe không hợp lệ hoặc khác công ty!');

    passenger.bus = bus;
    return await this.passRepo.save(passenger);
  }

  async update(passengerId: string, dto: UpdatePassengerDto, userId: string) {
    const passenger = await this.passRepo.findOne({ where: { id: passengerId } });
    if (!passenger) {
      throw new NotFoundException('Không tìm thấy hành khách!');
    }

    const linkage = await this.getTenantLinkage(userId, passenger.tenantId);

    if (linkage.role === TenantUserRole.DRIVER) {
      // DRIVER only allowed to swap bus assignment in this endpoint.
      if (
        dto.fullName !== undefined ||
        dto.phone !== undefined ||
        dto.email !== undefined
      ) {
        throw new ForbiddenException('DRIVER chỉ được phép cập nhật busId');
      }
    } else if (linkage.role !== TenantUserRole.TENANT_ADMIN) {
      throw new ForbiddenException('Chỉ TENANT_ADMIN hoặc DRIVER mới được phép cập nhật');
    }

    if (dto.busId !== undefined) {
      const bus = await this.busRepo.findOne({
        where: { id: dto.busId, tenantId: passenger.tenantId },
      });
      if (!bus) {
        throw new BadRequestException('Xe không hợp lệ hoặc khác tenant');
      }
      passenger.bus = bus;
      passenger.busId = bus.id;
    }

    if (linkage.role === TenantUserRole.TENANT_ADMIN) {
      if (dto.fullName !== undefined) passenger.fullName = dto.fullName;
      if (dto.phone !== undefined) passenger.phone = dto.phone;
      if (dto.email !== undefined) passenger.email = dto.email;
    }

    return await this.passRepo.save(passenger);
  }

  async remove(passengerId: string, userId: string) {
    const passenger = await this.passRepo.findOne({ where: { id: passengerId } });
    if (!passenger) {
      throw new NotFoundException('Không tìm thấy hành khách!');
    }

    await this.ensureTenantAdminForTenant(userId, passenger.tenantId);
    passenger.status = 'Deleted';
    await this.passRepo.save(passenger);
    return { message: 'Xóa hành khách thành công (soft delete)' };
  }
}
