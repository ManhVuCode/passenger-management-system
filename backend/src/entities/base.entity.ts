import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, BaseEntity } from 'typeorm';

// Class cha: Chứa các cột chung mà bảng nào cũng cần
export abstract class CustomBaseEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid') // Dùng ID dạng chuỗi ngẫu nhiên (UUID) bảo mật cao
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) 
  createdAt: Date; // Ngày tạo (tự động điền)

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) 
  updatedAt: Date; // Ngày cập nhật gần nhất (tự động sửa)
}