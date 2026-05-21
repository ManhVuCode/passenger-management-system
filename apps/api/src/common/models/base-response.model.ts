export interface Pagination {
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export class BaseResponse<T = unknown> {
  code: string
  message: string
  success: boolean
  data?: T
  pagination?: Pagination
  timestamp: string
  requestId?: string

  private constructor(params: {
    code: string
    message: string
    success: boolean
    data?: T
    pagination?: Pagination
    requestId?: string
  }) {
    this.code = params.code
    this.message = params.message
    this.success = params.success
    this.data = params.data
    this.pagination = params.pagination
    this.timestamp = new Date().toISOString()
    this.requestId = params.requestId
  }

  static ok<T>(data: T, message = 'Success'): BaseResponse<T> {
    return new BaseResponse({ code: '0', message, success: true, data })
  }

  static okMessage(message: string): BaseResponse<null> {
    return new BaseResponse({ code: '0', message, success: true })
  }

  static okPaginated<T>(
    data: T,
    pagination: Pagination,
    message = 'Success',
  ): BaseResponse<T> {
    return new BaseResponse({ code: '0', message, success: true, data, pagination })
  }

  static error(code: string, message: string): BaseResponse<null> {
    return new BaseResponse({ code, message, success: false })
  }

  static systemError(message = 'System error'): BaseResponse<null> {
    return new BaseResponse({ code: 'SYS_001', message, success: false })
  }
}
