import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseSuccessInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		// lấy response từ context
		const res: Response = context.switchToHttp().getResponse();
    return next
      .handle()
      .pipe(map((data) => {
        // tất cả các phương thức đều sẽ trả về định dạng chuẩn cho response thành công
        return {
          message: 'Success',
          statusCode: res.statusCode,
          data: data,
        };
      }));
  }
}
