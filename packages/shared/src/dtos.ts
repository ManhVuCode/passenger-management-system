export interface LoginDto {
  email: string
  password: string
}

export interface LoginResponseDto {
  accessToken: string
  userId: string
  tenantId: string
  role: string
  name: string
  email: string
}

export interface CreateTripDto {
  name: string
  description?: string
  startDate: string
  endDate: string
}

export interface UpdateTripDto {
  name?: string
  description?: string
  startDate?: string
  endDate?: string
}

export interface CreateRoundDto {
  name: string
  sequence: number
  departurePoint: string
  arrivalPoint: string
  scheduledDep: string
  scheduledArr: string
}

export interface CreateBusDto {
  licensePlate: string
  name: string
  capacity: number
  photoFront: string
  photoSide: string
  photoRear: string
}
