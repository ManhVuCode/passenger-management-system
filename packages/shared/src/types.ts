import { Role, TripStatus, RoundStatus, AttendanceStatus, TenantStatus } from './enums'

export interface Tenant {
  id: string
  name: string
  slug: string
  status: TenantStatus
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  tenantId: string
  email: string
  name: string
  role: Role
  createdAt: Date
}

export interface Trip {
  id: string
  tenantId: string
  name: string
  description?: string
  startDate: Date
  endDate: Date
  status: TripStatus
  createdAt: Date
}

export interface Round {
  id: string
  tripId: string
  tenantId: string
  name: string
  sequence: number
  departurePoint: string
  arrivalPoint: string
  scheduledDep: Date
  scheduledArr: Date
  status: RoundStatus
  createdAt: Date
}

export interface Bus {
  id: string
  tenantId: string
  licensePlate: string
  name: string
  capacity: number
  photoFront: string
  photoSide: string
  photoRear: string
  createdAt: Date
}

export interface TripPassengerAssignment {
  id: string
  tripId: string
  tenantId: string
  name: string
  phone: string
  idCard?: string
  type?: string
  note?: string
  hotelRoom?: string
  createdAt: Date
}

export interface AttendanceRecord {
  id: string
  roundPassengerAssignmentId: string
  status: AttendanceStatus
  markedBy: string
  markedAt: Date
  note?: string
}
