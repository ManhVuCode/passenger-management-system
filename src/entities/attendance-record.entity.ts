//(Lưu kết quả điểm danh)
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CustomBaseEntity } from './base.entity';
import { Round } from './round.entity';
import { TripPassenger } from './trip-passenger.entity';

@Entity('attendance_records')
export class AttendanceRecord extends CustomBaseEntity {
  // Điểm danh ở Chặng (Round) nào?
  @Column({ name: 'round_id' })
  roundId: string;
  @ManyToOne(() => Round, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'round_id' })
  round: Round;

  // Điểm danh cho ai (Hành khách trong trip)?
  @Column({ name: 'trip_passenger_id' })
  tripPassengerId: string;
  @ManyToOne(() => TripPassenger, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_passenger_id' })
  tripPassenger: TripPassenger;

  // Trạng thái
  @Column({ name: 'check_in', default: false })
  checkIn: boolean;

  @Column({ name: 'check_out', default: false })
  checkOut: boolean;

  @Column({ name: 'abnormal_note', type: 'text', nullable: true })
  abnormalNote: string; // Ghi chú bất thường (VD: Khách bị lạc, về sớm)
}