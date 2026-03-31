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

        return new BadRequestException({
          code: hasMissingField ? '1002' : '1004',
          message: hasMissingField
            ? 'Parameter is not enough'
            : 'Parameter value is invalid',
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