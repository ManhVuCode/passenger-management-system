import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Passenger } from '../entities/passenger.entity';
import { TripAssignment } from '../entities/trip-assignment.entity';
import { Trip } from '../entities/trip.entity';
import { TenantUserRole } from '../entities/user-tenant-role.entity';

interface DashboardAuthContext {
  id?: string;
  userId?: string;
  tenantId?: string;
  currentTenantId?: string;
  role?: TenantUserRole;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(TripAssignment)
    private readonly tripAssignmentRepo: Repository<TripAssignment>,
  ) {}

  async getStats(auth: DashboardAuthContext): Promise<{ totalTrips: number; totalPassengers: number }> {
    const userId = auth.userId ?? auth.id;
    const tenantId = auth.currentTenantId ?? auth.tenantId;
    const role = auth.role;

    if (!userId || !tenantId) {
      throw new ForbiddenException('Thiếu ngữ cảnh user/tenant trong token');
    }

    if (role === TenantUserRole.TENANT_ADMIN) {
      const [totalTrips, totalPassengers] = await Promise.all([
        this.tripRepo
          .createQueryBuilder('trip')
          .where('trip.tenantId = :tenantId', { tenantId })
          .andWhere('trip.status != :deletedStatus', { deletedStatus: 'Deleted' })
          .getCount(),
        this.passengerRepo
          .createQueryBuilder('passenger')
          .where('passenger.tenantId = :tenantId', { tenantId })
          .andWhere('passenger.status != :deletedStatus', { deletedStatus: 'Deleted' })
          .getCount(),
      ]);

      return { totalTrips, totalPassengers };
    }

    if (role === TenantUserRole.DRIVER) {
      const totalTripsRaw = await this.tripAssignmentRepo
        .createQueryBuilder('assignment')
        .innerJoin('assignment.trip', 'trip')
        .select('COUNT(DISTINCT assignment.tripId)', 'count')
        .where('assignment.driverId = :driverId', { driverId: userId })
        .andWhere('trip.tenantId = :tenantId', { tenantId })
        .andWhere('trip.status != :deletedStatus', { deletedStatus: 'Deleted' })
        .getRawOne<{ count: string }>();

      const totalPassengersRaw = await this.passengerRepo
        .createQueryBuilder('passenger')
        .innerJoin(
          TripAssignment,
          'assignment',
          'assignment.tripId = passenger.tripId AND assignment.driverId = :driverId',
          { driverId: userId },
        )
        .select('COUNT(DISTINCT passenger.id)', 'count')
        .where('passenger.tenantId = :tenantId', { tenantId })
        .andWhere('passenger.status != :deletedStatus', { deletedStatus: 'Deleted' })
        .getRawOne<{ count: string }>();

      return {
        totalTrips: Number(totalTripsRaw?.count ?? 0),
        totalPassengers: Number(totalPassengersRaw?.count ?? 0),
      };
    }

    return { totalTrips: 0, totalPassengers: 0 };
  }
}

