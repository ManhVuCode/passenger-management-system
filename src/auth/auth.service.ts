import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt'; // <-- Import jwt

import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { Role } from '../entities/role.entity';
import { UserTenantRole } from '../entities/user-tenant-role.entity';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { LoginDto } from './dto/login.dto'; // <-- Import ->> dang nhap

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    private dataSource: DataSource, // Dùng để quản lý giao dịch
    private jwtService: JwtService, // <-- Inject máy in vé
  ) {}

  async registerTenant(dto: RegisterTenantDto) {
    // 1. Kiểm tra Email trùng
    const existUser = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existUser) throw new BadRequestException('Email này đã tồn tại!');

    // 2. Bắt đầu giao dịch (Transaction)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // B2.1: Tạo Tenant
      const newTenant = this.tenantRepo.create({ name: dto.tenantName });
      await queryRunner.manager.save(newTenant);

      // B2.2: Mã hóa mật khẩu & Tạo User
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(dto.password, salt);
      
      const newUser = this.userRepo.create({
        email: dto.email,
        passwordHash: hashedPassword,
        description: `Admin của ${dto.tenantName}`,
      });
      await queryRunner.manager.save(newUser);

      // B2.3: Tìm hoặc tạo Role "Admin"
      let adminRole = await this.roleRepo.findOne({ where: { name: 'Admin' } });
      if (!adminRole) {
        adminRole = this.roleRepo.create({ name: 'Admin', description: 'Quản trị viên' });
        await queryRunner.manager.save(adminRole);
      }

      // B2.4: Liên kết (User - Tenant - Role)
      const link = new UserTenantRole();
      link.user = newUser;
      link.tenant = newTenant;
      link.role = adminRole;
      await queryRunner.manager.save(link);

      // Lưu tất cả vào DB
      await queryRunner.commitTransaction();

      return { 
        message: 'Đăng ký thành công!', 
        data: { tenant: newTenant.name, user: newUser.email } 
      };

    } catch (err) {
      // Có lỗi thì hoàn tác hết
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // --- 2. Chức năng Đăng Nhập (MỚI) ---
  async login(dto: LoginDto) {
    // B1: Tìm user theo email (nhớ lấy thêm cột password_hash vì mặc định nó bị ẩn)
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash') // Lấy mật khẩu ra để so sánh
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // B2: So sánh mật khẩu nhập vào vs mật khẩu mã hóa trong DB
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // B3: Đăng nhập thành công -> Tạo Token
    // Payload là thông tin nhét vào trong vé
    const payload = { sub: user.id, email: user.email };
    
    return {
      message: 'Đăng nhập thành công',
      access_token: this.jwtService.sign(payload), // Ký tên đóng dấu
      user: {
        id: user.id,
        email: user.email,
        name: user.description // Tạm thời lấy description làm tên hiển thị
      }
    };
  }
}