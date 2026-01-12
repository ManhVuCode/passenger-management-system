import { Entity, Column } from 'typeorm';
import { CustomBaseEntity } from './base.entity';

@Entity('roles') // Bảng Quyền hạn
export class Role extends CustomBaseEntity {
  @Column({ unique: true }) 
  name: string; // Tên quyền (VD: Admin, BusManager)

  @Column({ nullable: true, type: 'text' }) 
  description: string;
}