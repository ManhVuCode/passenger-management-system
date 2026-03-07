//(Giải quyết bài toán: Một người đi nhiều chuyến)
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CustomBaseEntity } from './base.entity';
import { Trip } from './trip.entity';
import { Passenger } from './passenger.entity';
import { Bus } from './bus.entity';

@Entity('trip_passengers')
export class TripPassenger extends CustomBaseEntity {
  // 1. Thuộc Trip nào?
  @Column({ name: 'trip_id' })
  tripId: string;
  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  // 2. Là hành khách nào?
  @Column({ name: 'passenger_id' })
  passengerId: string;
  @ManyToOne(() => Passenger, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'passenger_id' })
  passenger: Passenger;

  // 3. Ngồi xe nào trong Trip đó?
  @Column({ name: 'assigned_bus_id', nullable: true })
  assignedBusId: string;
  @ManyToOne(() => Bus, { nullable: true, onDelete: 'SET NULL' }) // Xóa xe thì khách vẫn còn trong trip
  @JoinColumn({ name: 'assigned_bus_id' })
  assignedBus: Bus;
  
  @Column({ type: 'text', nullable: true })
  note: string; // Ghi chú riêng cho chuyến này (VD: Ăn chay)
}