import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { TenantUserRole, UserTenantRole } from '../entities/user-tenant-role.entity';
import { UpdateUserDto } from './dto/update-user.dto';

interface CurrentAuthContext {
  id?: string;
  userId?: string;
  tenantId?: string;
  currentTenantId?: string;
  role?: TenantUserRole;
}

export interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: TenantUserRole;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserTenantRole) private readonly utrRepo: Repository<UserTenantRole>,
  ) {}

  private resolveAuthContext(auth: CurrentAuthContext): {
    currentUserId: string;
    currentTenantId: string;
  } {
    const currentUserId = auth.userId ?? auth.id;
    const currentTenantId = auth.currentTenantId ?? auth.tenantId;

    if (!currentUserId || !currentTenantId) {
      throw new ForbiddenException('Thiếu ngữ cảnh user/tenant trong token');
    }

    return { currentUserId, currentTenantId };
  }

  private async ensureTenantAdmin(currentUserId: string, currentTenantId: string): Promise<void> {
    const adminLink = await this.utrRepo.findOne({
      where: {
        userId: currentUserId,
        tenantId: currentTenantId,
        role: TenantUserRole.TENANT_ADMIN,
        isActive: true,
      },
    });

    if (!adminLink) {
      throw new ForbiddenException('Bạn không có quyền tạo nhân sự cho tenant này');
    }
  }

  private toListItem(link: UserTenantRole): UserListItem {
    return {
      id: link.user.id,
      fullName: link.user.description,
      email: link.user.email,
      phone: link.user.phone,
      role: link.role,
      isActive: link.isActive,
      createdAt: link.user.createdAt,
    };
  }

  private async resolveCurrentRole(
    auth: CurrentAuthContext,
    currentUserId: string,
    currentTenantId: string,
  ): Promise<TenantUserRole | null> {
    if (auth.role) {
      return auth.role;
    }

    const linkage = await this.utrRepo.findOne({
      where: { userId: currentUserId, tenantId: currentTenantId, isActive: true },
    });

    return linkage?.role ?? null;
  }

  async create(dto: CreateUserDto, auth: CurrentAuthContext): Promise<UserListItem> {
    const { currentUserId, currentTenantId } = this.resolveAuthContext(auth);
    await this.ensureTenantAdmin(currentUserId, currentTenantId);

    if (dto.role === TenantUserRole.TENANT_ADMIN) {
      throw new BadRequestException('Không thể tự tạo thêm TENANT_ADMIN qua API này');
    }

    const existingUser = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new BadRequestException('Email này đã tồn tại!');
    }

    const hashedPassword = await bcrypt.hash(dto.password, await bcrypt.genSalt());

    const newUser = this.userRepo.create({
      email: dto.email,
      passwordHash: hashedPassword,
      description: dto.fullName,
      phone: dto.phone,
    });
    await this.userRepo.save(newUser);

    const newLink = this.utrRepo.create({
      userId: newUser.id,
      tenantId: currentTenantId,
      role: dto.role,
      isActive: true,
    });
    await this.utrRepo.save(newLink);

    const savedLink = await this.utrRepo.findOne({
      where: { id: newLink.id },
      relations: ['user'],
    });

    if (!savedLink) {
      throw new NotFoundException('Không thể tải thông tin user vừa tạo');
    }

    return this.toListItem(savedLink);
  }

  async findAll(auth: CurrentAuthContext): Promise<UserListItem[]> {
    const { currentUserId, currentTenantId } = this.resolveAuthContext(auth);
    await this.ensureTenantAdmin(currentUserId, currentTenantId);

    const links = await this.utrRepo.find({
      where: { tenantId: currentTenantId, isActive: true },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return links.map((link) => this.toListItem(link));
  }

  async remove(targetUserId: string, auth: CurrentAuthContext) {
    const { currentUserId, currentTenantId } = this.resolveAuthContext(auth);
    await this.ensureTenantAdmin(currentUserId, currentTenantId);

    const targetLink = await this.utrRepo.findOne({
      where: { userId: targetUserId, tenantId: currentTenantId },
      relations: ['user'],
    });

    if (!targetLink) {
      throw new NotFoundException('Không tìm thấy user trong tenant này');
    }

    if (targetLink.role === TenantUserRole.TENANT_ADMIN) {
      throw new ForbiddenException('Không thể xóa TENANT_ADMIN của tenant');
    }

    const targetUser = targetLink.user;
    const deletedSuffix = Math.floor(Date.now() / 1000);
    targetUser.email = `${targetUser.email}-deleted-${deletedSuffix}`;
    await this.userRepo.save(targetUser);

    targetLink.isActive = false;
    await this.utrRepo.save(targetLink);
    await this.userRepo.softDelete(targetUser.id);

    return { message: 'Xóa user thành công (rename + soft delete)' };
  }

  async update(targetUserId: string, dto: UpdateUserDto, auth: CurrentAuthContext): Promise<UserListItem> {
    const { currentUserId, currentTenantId } = this.resolveAuthContext(auth);
    const currentRole = await this.resolveCurrentRole(auth, currentUserId, currentTenantId);
    const isSelfEdit = currentUserId === targetUserId;

    if (!isSelfEdit && currentRole !== TenantUserRole.TENANT_ADMIN) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa user này');
    }

    if (!isSelfEdit) {
      const targetLinkInTenant = await this.utrRepo.findOne({
        where: { userId: targetUserId, tenantId: currentTenantId, isActive: true },
      });

      if (!targetLinkInTenant) {
        throw new ForbiddenException('Không thể chỉnh sửa user ngoài tenant hiện tại');
      }
    }

    const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException('Không tìm thấy user');
    }

    if (dto.fullName !== undefined) {
      targetUser.description = dto.fullName;
    }
    if (dto.phone !== undefined) {
      targetUser.phone = dto.phone;
    }

    await this.userRepo.save(targetUser);

    const targetLink = await this.utrRepo.findOne({
      where: { userId: targetUserId, tenantId: currentTenantId },
      relations: ['user'],
    });

    if (targetLink?.user) {
      return this.toListItem(targetLink);
    }

    return {
      id: targetUser.id,
      fullName: targetUser.description,
      email: targetUser.email,
      phone: targetUser.phone,
      role: currentRole ?? TenantUserRole.STAFF,
      isActive: true,
      createdAt: targetUser.createdAt,
    };
  }
}
