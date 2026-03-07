import { Entity, Column, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { CustomBaseEntity } from './base.entity';
import { Trip } from './trip.entity';
import { Bus } from './bus.entity';
import { User } from './user.entity';

@Entity('trip_assignments')
@Unique(['tripId', 'busId'])
export class TripAssignment extends CustomBaseEntity {
  @Column({ name: 'trip_id' })
  tripId: string;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ name: 'bus_id' })
  busId: string;

  @ManyToOne(() => Bus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bus_id' })
  bus: Bus;

  @Column({ name: 'driver_id' })
  driverId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: User;
}

