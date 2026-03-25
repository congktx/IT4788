import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { APP_RESPONSE } from '../../constants/response.constants';

@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    console.log('AUTH GUARD err =', err);
    console.log('AUTH GUARD user =', user);
    
    if (err) {
      throw err;
    }

    if (!user) {
      throw new UnauthorizedException({
        code: APP_RESPONSE.TOKEN_INVALID.code,
        message: APP_RESPONSE.TOKEN_INVALID.message,
        data: null,
      });
    }

    return user;
  }
}
