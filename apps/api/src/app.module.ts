import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { TenantGuard } from './common/guards/tenant.guard'
import { TripModule } from './modules/trip/trip.module';
import { RoundModule } from './modules/round/round.module';
import { BusModule } from './modules/bus/bus.module';
import { AssignmentModule } from './modules/assignment/assignment.module';
import { PassengerModule } from './modules/passenger/passenger.module';
import { AllocationModule } from './modules/allocation/allocation.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { MeModule } from './modules/me/me.module';
import { GatewayModule } from './gateway/gateway.module';
import { NotificationModule } from './modules/notification/notification.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TripModule,
    RoundModule,
    BusModule,
    AssignmentModule,
    PassengerModule,
    AllocationModule,
    AttendanceModule,
    MeModule,
    GatewayModule,
    NotificationModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
  ],
})
export class AppModule {}
