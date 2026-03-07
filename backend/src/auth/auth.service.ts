import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { TenantUserRole, UserTenantRole } from '../entities/user-tenant-role.entity';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { LoginDto } from './dto/login.dto';

interface AuthTokenPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: TenantUserRole;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(UserTenantRole) private utrRepo: Repository<UserTenantRole>,
    private dataSource: DataSource,
    private jwtService: JwtService,
  ) {}

  async registerTenant(dto: RegisterTenantDto) {
    const existUser = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existUser) {
      throw new BadRequestException('Email này đã tồn tại!');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const newTenant = this.tenantRepo.create({ name: dto.tenantName });
      await queryRunner.manager.save(newTenant);

      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(dto.password, salt);

      const newUser = this.userRepo.create({
        email: dto.email,
        passwordHash: hashedPassword,
        description: dto.fullName || `Admin của ${dto.tenantName}`,
      });
      await queryRunner.manager.save(newUser);

      const link = new UserTenantRole();
      link.user = newUser;
      link.tenant = newTenant;
      link.role = TenantUserRole.TENANT_ADMIN;
      link.isActive = true;
      await queryRunner.manager.save(link);

      await queryRunner.commitTransaction();

      return {
        message: 'Đăng ký thành công!',
        data: {
          tenant: newTenant.name,
          user: newUser.email,
          role: TenantUserRole.TENANT_ADMIN,
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const activeLinkage = await this.utrRepo.findOne({
      where: {
        userId: user.id,
        isActive: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    if (!activeLinkage || !activeLinkage.tenantId) {
      throw new UnauthorizedException('Tài khoản chưa được gán tenant hoạt động');
    }

    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
      tenantId: activeLinkage.tenantId,
      role: activeLinkage.role,
    };

    return {
      message: 'Đăng nhập thành công',
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.description,
        tenantId: activeLinkage.tenantId,
        role: activeLinkage.role,
      },
    };
  }
}
