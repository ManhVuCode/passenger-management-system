import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { BaseResponse } from '../models/base-response.model'

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof BaseResponse) return data
        if (data == null) return BaseResponse.okMessage('Success')
        return BaseResponse.ok(data)
      }),
    )
  }
}
