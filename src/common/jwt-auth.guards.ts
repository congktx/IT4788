import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends (AuthGuard('jwt') as any) {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
  handleRequest(err, user) {
    if (err || !user) {
      throw err || { code: 9998, message: 'Token is invalid.' };
    }
    return user;
  }
}
