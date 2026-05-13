import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { APP_RESPONSE } from '../../constants/response.constants';

@Injectable()
export class OptionalAuthGuard extends PassportAuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    console.log('AUTH GUARD err =', err);
    console.log('AUTH GUARD user =', user);

    return user || null;
  }
}
