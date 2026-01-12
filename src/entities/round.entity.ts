//(Mỗi chuyến đi có nhiều điểm cần điểm danh)
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CustomBaseEntity } from './base.entity';
import { Trip } from './trip.entity';

@Entity('rounds')
export class Round extends CustomBaseEntity {
  @Column({ name: 'trip_id' })
  tripId: string;

  // Liên kết: Round thuộc về Trip nào? Xóa Trip -> Xóa hết Round
  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column()
  name: string; // Tên chặng (VD: Điểm danh lên xe, Ăn trưa)

  @Column({ name: 'time_text', nullable: true })
  timeText: string; // Thời gian (Lưu dạng text cho linh hoạt, VD: "08:00 Sáng")

  @Column({ default: 'Doing' })
  status: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number; // Số thứ tự để sắp xếp (Cái nào hiện trước/sau)
}