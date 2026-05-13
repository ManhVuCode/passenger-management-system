export interface ApiResponse<T> {
  data: T
  message: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  message: string
  statusCode: number
}

export interface JwtPayload {
  userId: string
  tenantId: string
  role: string
  iat?: number
  exp?: number
}
