import { Entity, Column } from 'typeorm';
import { CustomBaseEntity } from './base.entity';

@Entity('tenants') // Bảng Tổ chức (Khách hàng thuê phần mềm)
export class Tenant extends CustomBaseEntity {
  @Column({ unique: true }) 
  name: string; // Tên tổ chức (VD: SOICT, Viettravel)

  @Column({ nullable: true, type: 'text' }) 
  description: string; // Mô tả thêm
}