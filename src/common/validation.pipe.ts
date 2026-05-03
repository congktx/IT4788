import {
  BadRequestException,
  Injectable,
  ValidationError,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';

@Injectable()
export class ValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = flattenErrors(errors);

        const hasMissingField = messages.includes('1002');
        const hasInvalidType = messages.includes('1003');

        // Mặc định là 1004 (Giá trị không hợp lệ)
        let errorCode = '1004';
        let errorMessage = 'Parameter value is invalid.';

        // Mức độ ưu tiên cao nhất: Lỗi 1002 (Thiếu tham số)
        if (hasMissingField) {
          errorCode = '1002';
          errorMessage = 'Parameter is not enough.';
        } 
        // Ưu tiên thứ 2: Lỗi 1003 (Sai kiểu dữ liệu)
        else if (hasInvalidType) {
          errorCode = '1003';
          errorMessage = 'Parameter type is invalid.';
        }

        return new BadRequestException({
          code: errorCode,
          message: errorMessage,
          data: null,
        });
      },
    });
  }
}

function flattenErrors(errors: ValidationError[]): string[] {
  const result: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      result.push(...Object.values(error.constraints));
    }

    if (error.children && error.children.length > 0) {
      result.push(...flattenErrors(error.children));
    }
  }

  return result;
}