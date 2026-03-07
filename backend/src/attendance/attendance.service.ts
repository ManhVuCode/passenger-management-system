import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { Round } from '../entities/round.entity';
import { Passenger } from '../entities/passenger.entity';
import { UserTenantRole } from '../entities/user-tenant-role.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord) private attendanceRepo: Repository<AttendanceRecord>,
    @InjectRepository(Round) private roundRepo: Repository<Round>,
    @InjectRepository(Passenger) private passengerRepo: Repository<Passenger>,
    @InjectRepository(UserTenantRole) private utrRepo: Repository<UserTenantRole>,
  ) {}

  async checkIn(dto: CreateAttendanceDto, userId: string) {
    // 1. [QUAN TRỌNG] Tìm Hành khách theo ID trước (Không quan tâm công ty nào)
    const passenger = await this.passengerRepo.findOne({
      where: { id: dto.passengerId }
    });
    if (!passenger) throw new NotFoundException('Hành khách không tồn tại!');

    // 2. [LOGIC MỚI] Kiểm tra quyền: User có thuộc công ty của Hành khách này không?
    const linkage = await this.utrRepo.findOne({
      where: { 
        userId, 
        tenantId: passenger.tenantId, // <--- Khóa chặt quyền ở đây
        isActive: true 
      }
    });

    if (!linkage) {
       throw new ForbiddenException('Bạn không có quyền điểm danh cho khách của công ty này!');
    }

    // 3. Tìm Chặng (Round)
    const round = await this.roundRepo.findOne({
      where: { id: dto.roundId },
      relations: ['trip']
    });
    
    // Check xem chặng có tồn tại và có cùng công ty với khách không?
    if (!round) throw new NotFoundException('Chặng đường không tồn tại!');
    
    // Check thêm: Chặng và Khách phải cùng 1 công ty (Tránh râu ông nọ cắm cằm bà kia)
    if (round.trip.tenantId !== passenger.tenantId) {
        throw new BadRequestException('Lỗi dữ liệu: Hành khách và Chuyến đi không thuộc cùng một công ty!');
    }

    // 4. Tìm bản ghi cũ (Upsert logic)
    let record = await this.attendanceRepo.findOne({
      where: { roundId: dto.roundId, passengerId: dto.passengerId }
    });

    if (record) {
      // Nếu có rồi -> Cập nhật
      record.isPresent = dto.isPresent;
      record.note = dto.note;
    } else {
      // Nếu chưa -> Tạo mới
      record = this.attendanceRepo.create({
        round: round,
        passenger: passenger,
        isPresent: dto.isPresent,
        note: dto.note
      });
    }

    return await this.attendanceRepo.save(record);
  }

  // Lấy danh sách
  async findByRound(roundId: string) {
    return await this.attendanceRepo.find({
      where: { roundId },
      relations: ['passenger'], 
      order: { updatedAt: 'DESC' }
    });
  }
}