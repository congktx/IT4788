import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../../modules/users/users.service';
import { APP_RESPONSE } from '../../constants/response.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev-secret'),
    });
  }

  async validate(payload: { sub: number; username: string; role: string }) {
    console.log('JWT payload:', payload);
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException({
        code: APP_RESPONSE.USER_NOT_VALIDATED.code,
        message: APP_RESPONSE.USER_NOT_VALIDATED.message,
        data: null,
      });
    }

    return {
      id: user.id,
      userId: user.id,
      username: user.username,
      role: user.role,
    };
  }
}