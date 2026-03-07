import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { UserTenantRole } from '../entities/user-tenant-role.entity';
import { TenantAdminGuard } from './guards/tenant-admin.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserTenantRole]), AuthModule],
  controllers: [UsersController],
  providers: [UsersService, TenantAdminGuard],
})
export class UsersModule {}
