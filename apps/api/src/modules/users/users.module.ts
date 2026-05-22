import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { SystemAdminModule } from '../system-admin/system-admin.module'

@Module({
  imports: [SystemAdminModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
