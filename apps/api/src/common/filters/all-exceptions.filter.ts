import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { BaseResponse } from '../models/base-response.model'
import { AppErrorCode } from '../models/app-error.enum'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let code: string = AppErrorCode.SYSTEM_ERROR
    let message = 'Internal server error'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const res = exception.getResponse()

      if (typeof res === 'string') {
        message = res
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>
        if (Array.isArray(resObj['message'])) {
          message = (resObj['message'] as string[]).join(', ')
        } else {
          message = (resObj['message'] as string) ?? message
        }
      }

      code = this.statusToCode(status)
    } else if (exception instanceof Error) {
      message = exception.message
      this.logger.error(`Unhandled error: ${message}`, exception.stack)
    }

    this.logger.warn(
      `${request.method} ${request.url} → ${status} [${code}] ${message}`,
    )

    response.status(status).json(BaseResponse.error(code, message))
  }

  private statusToCode(status: number): AppErrorCode {
    switch (status) {
      case 401: return AppErrorCode.UNAUTHORIZED
      case 403: return AppErrorCode.FORBIDDEN
      case 404: return AppErrorCode.NOT_FOUND
      case 409: return AppErrorCode.ALLOCATION_DUPLICATE
      case 400: return AppErrorCode.VALIDATION_ERROR
      default:  return AppErrorCode.SYSTEM_ERROR
    }
  }
}
