import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { CustomBaseEntity } from './base.entity';
import { Round } from './/round.entity';
import { Passenger } from './passenger.entity';

@Entity('attendance_records')
@Unique(['roundId', 'passengerId']) // Một khách chỉ điểm danh 1 lần trong 1 chặng
export class AttendanceRecord extends CustomBaseEntity {
  // Trạng thái: true = Đã lên xe, false = Vắng
  @Column({ name: 'is_present', default: false })
  isPresent: boolean;

  @Column({ type: 'text', nullable: true })
  note?: string; // VD: Khách say xe, Khách lên muộn...

  // --- 1. Thuộc Chặng nào? ---
  @Column({ name: 'round_id' })
  roundId: string;

  @ManyToOne(() => Round)
  @JoinColumn({ name: 'round_id' })
  round: Round;

  // --- 2. Khách nào? ---
  @Column({ name: 'passenger_id' })
  passengerId: string;

  @ManyToOne(() => Passenger)
  @JoinColumn({ name: 'passenger_id' })
  passenger: Passenger;
}