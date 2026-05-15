import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { SystemAdminService } from './system-admin.service'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload, Role } from '@pms/shared'
import { CreateTenantDto } from './dto/create-tenant.dto'
import { UpdateTenantDto } from './dto/update-tenant.dto'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@Controller('system/tenants')
@Roles(Role.SYSTEM_ADMIN)
export class SystemAdminController {
  constructor(private systemAdminService: SystemAdminService) {}

  @Get()
  listTenants() {
    return this.systemAdminService.listTenants()
  }

  @Get('current/users')
  @Roles(Role.ADMIN, Role.SYSTEM_ADMIN)
  getCurrentTenantUsers(
    @Query('role') role: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.systemAdminService.listUsers(user.tenantId, role)
  }

  @Post()
  createTenant(@Body() dto: CreateTenantDto) {
    return this.systemAdminService.createTenant(dto)
  }

  @Patch(':id')
  updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.systemAdminService.updateTenant(id, dto)
  }

  @Get(':id/users')
  listUsers(@Param('id') id: string) {
    return this.systemAdminService.listUsers(id)
  }

  @Post(':id/users')
  createUser(@Param('id') id: string, @Body() dto: CreateUserDto) {
    return this.systemAdminService.createUser(id, dto)
  }

  @Patch(':id/users/:userId')
  updateUser(@Param('userId') userId: string, @Body() dto: UpdateUserDto) {
    return this.systemAdminService.updateUser(userId, dto)
  }

  @Delete(':id/users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeUser(@Param('userId') userId: string) {
    return this.systemAdminService.removeUser(userId)
  }
}
