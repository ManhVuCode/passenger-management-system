export interface Pagination {
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ApiResponse<T = unknown> {
  code: string
  message: string
  success: boolean
  data?: T
  pagination?: Pagination
  timestamp: string
  requestId?: string
}

export interface JwtPayload {
  userId: string
  tenantId: string
  role: string
  iat?: number
  exp?: number
}
