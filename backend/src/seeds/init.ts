import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { TenantUserRole, UserTenantRole } from '../entities/user-tenant-role.entity';
import { Trip } from '../entities/trip.entity';
import { Round } from '../entities/round.entity';

const TENANT_NAME = 'HUST Transportation';
const ADMIN_EMAIL = 'admin@hust.edu.vn';
const ADMIN_PASSWORD = '123456';
const ADMIN_FULL_NAME = 'HUST Tenant Admin';
const DEMO_TRIP_NAME = 'HUST Hà Nội - Sa Pa (2 ngày 1 đêm)';

async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const dataSource = app.get(DataSource);

    const tenantRepo = dataSource.getRepository(Tenant);
    const userRepo = dataSource.getRepository(User);
    const utrRepo = dataSource.getRepository(UserTenantRole);
    const tripRepo = dataSource.getRepository(Trip);
    const roundRepo = dataSource.getRepository(Round);

    let tenant = await tenantRepo.findOne({ where: { name: TENANT_NAME } });

    if (!tenant) {
      tenant = tenantRepo.create({
        name: TENANT_NAME,
        description: 'Seeded tenant for MVP bootstrap',
      });
      tenant = await tenantRepo.save(tenant);
      console.log(`[seed] Created tenant: ${TENANT_NAME}`);
    } else {
      console.log(`[seed] Tenant already exists: ${TENANT_NAME}`);
    }

    let user = await userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: ADMIN_EMAIL })
      .getOne();

    if (!user) {
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, await bcrypt.genSalt());
      user = userRepo.create({
        email: ADMIN_EMAIL,
        passwordHash: hashedPassword,
        description: ADMIN_FULL_NAME,
      });
      user = await userRepo.save(user);
      console.log(`[seed] Created user: ${ADMIN_EMAIL}`);
    } else {
      console.log(`[seed] User already exists: ${ADMIN_EMAIL}`);
    }

    let linkage = await utrRepo.findOne({
      where: {
        userId: user.id,
        tenantId: tenant.id,
      },
    });

    if (!linkage) {
      linkage = utrRepo.create({
        userId: user.id,
        tenantId: tenant.id,
        role: TenantUserRole.TENANT_ADMIN,
        isActive: true,
      });
      await utrRepo.save(linkage);
      console.log('[seed] Linked user to tenant as TENANT_ADMIN');
    } else {
      linkage.role = TenantUserRole.TENANT_ADMIN;
      linkage.isActive = true;
      await utrRepo.save(linkage);
      console.log('[seed] Existing linkage updated to TENANT_ADMIN');
    }

    const demoTripStart = new Date('2026-02-10T06:00:00.000Z');
    const demoTripEnd = new Date('2026-02-11T18:00:00.000Z');

    let demoTrip = await tripRepo.findOne({
      where: {
        tenantId: tenant.id,
        name: DEMO_TRIP_NAME,
      },
    });

    if (!demoTrip) {
      demoTrip = tripRepo.create({
        tenantId: tenant.id,
        name: DEMO_TRIP_NAME,
        status: 'Doing',
        description: 'Seeded multi-day trip for round timeline validation',
        startDate: demoTripStart,
        endDate: demoTripEnd,
      });
      demoTrip = await tripRepo.save(demoTrip);
      console.log(`[seed] Created demo trip: ${DEMO_TRIP_NAME}`);
    } else {
      demoTrip.startDate = demoTripStart;
      demoTrip.endDate = demoTripEnd;
      demoTrip = await tripRepo.save(demoTrip);
      console.log(`[seed] Demo trip already exists, timeline refreshed: ${DEMO_TRIP_NAME}`);
    }

    const roundSeeds: Array<{ name: string; departureTime: Date; sortOrder: number }> = [
      {
        name: 'Day 1 - Outbound',
        departureTime: new Date('2026-02-10T07:30:00.000Z'),
        sortOrder: 1,
      },
      {
        name: 'Day 2 - Inbound',
        departureTime: new Date('2026-02-11T15:30:00.000Z'),
        sortOrder: 2,
      },
    ];

    for (const roundSeed of roundSeeds) {
      let round = await roundRepo.findOne({
        where: {
          tripId: demoTrip.id,
          name: roundSeed.name,
        },
      });

      if (!round) {
        round = roundRepo.create({
          tripId: demoTrip.id,
          name: roundSeed.name,
          departureTime: roundSeed.departureTime,
          sortOrder: roundSeed.sortOrder,
          status: 'Doing',
        });
        await roundRepo.save(round);
        console.log(`[seed] Created round: ${roundSeed.name}`);
      } else {
        round.departureTime = roundSeed.departureTime;
        round.sortOrder = roundSeed.sortOrder;
        await roundRepo.save(round);
        console.log(`[seed] Updated round: ${roundSeed.name}`);
      }
    }

    console.log('[seed] Done. Login with admin@hust.edu.vn / 123456');
  } finally {
    await app.close();
  }
}

void seed();
