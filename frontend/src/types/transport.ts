export interface Trip {
  id: string;
  name: string;
  status?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  tenantId?: string;
  createdAt?: string;
}

export interface AssignmentDriver {
  id: string;
  email: string;
  description?: string;
  phone?: string;
}

export interface Round {
  id: string;
  tripId: string;
  name: string;
  departureTime: string;
  sortOrder?: number;
}

export interface Bus {
  id: string;
  licensePlate: string;
  busCode?: string;
  seatCount?: number;
  status?: string;
  tenantId?: string;
  createdAt?: string;
}

export interface TripAssignment {
  id: string;
  tripId: string;
  busId: string;
  driverId: string;
  trip?: Trip;
  bus?: Bus;
  driver?: AssignmentDriver;
  createdAt?: string;
}

export interface Passenger {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  tripId: string;
  busId?: string;
  status?: string;
  tenantId?: string;
  bus?: Bus | null;
}

export interface AttendanceRecord {
  id: string;
  roundId: string;
  passengerId: string;
  isPresent: boolean;
  note?: string;
  updatedAt?: string;
  passenger?: Passenger;
}

export interface AttendanceSavePayload {
  roundId: string;
  passengerId: string;
  isPresent: boolean;
  note?: string;
}
