import { Entity, Column, DeleteDateColumn } from 'typeorm';
import { CustomBaseEntity } from './base.entity';

@Entity('users') // Bảng Người dùng hệ thống
export class User extends CustomBaseEntity {
  @Column({ unique: true }) 
  email: string; // Email đăng nhập

  @Column({ name: 'password_hash', select: false }) 
  passwordHash: string; // Mật khẩu đã mã hóa (select: false để ẩn khi query)

  @Column({ nullable: true, type: 'text' }) 
  description: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'latest_at', type: 'timestamptz', nullable: true }) 
  latestAt: Date; // Thời điểm đăng nhập cuối cùng

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}
