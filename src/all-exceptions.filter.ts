import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { APP_RESPONSE } from './modules/constants/response.constants';

@Catch() // Bắt mọi loại lỗi
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Nếu lỗi là HttpException (các lỗi do bạn chủ động ném ra hoặc từ Pipe)
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      // Ép HTTP Status luôn là 200, còn body là format bạn định nghĩa
      return response.status(HttpStatus.OK).json(exceptionResponse);
    }

    console.error('=== UNHANDLED EXCEPTION ===', exception);

    // Nếu là lỗi hệ thống (500 Internal Server Error, crash code...)
    return response.status(HttpStatus.OK).json({
      ...APP_RESPONSE.EXCEPTION_ERROR,
      data: null
    });
  }
}