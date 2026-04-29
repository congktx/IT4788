import { Body, Controller, Headers, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { APP_RESPONSE, buildResponse } from '../../common/constants/response.constants';
import { SetDevtokenDto } from './dto/set-devtoken.dto';
import { DevTokensService } from './dev-tokens.service';

@Controller('dev_tokens')
export class DevTokensController {
  constructor(
    private readonly devTokensService: DevTokensService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization) return null;

    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) return null;

    return token;
  }

  @Post('set_devtoken')
  async setDevtoken(
    @Body() dto: SetDevtokenDto,
    @Headers('authorization') authorization?: string,
  ) {
    try {
      const headerToken = this.extractBearerToken(authorization);
      const accessToken = headerToken || dto.token;

      if (!accessToken || accessToken.trim().length < 10) {
        return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID, null);
      }

      let payload: any;

      try {
        payload = await this.jwtService.verifyAsync(accessToken);
      } catch (error) {
        return buildResponse(APP_RESPONSE.TOKEN_INVALID, null);
      }

      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        return buildResponse(APP_RESPONSE.USER_NOT_VALIDATED, null);
      }

      await this.devTokensService.upsertDevToken(user.id, {
        devtype: dto.devtype,
        devtoken: dto.devtoken.trim(),
      });

      return buildResponse(APP_RESPONSE.OK, 'OK');
    } catch (error) {
      console.error('setDevtoken error:', error);
      return buildResponse(APP_RESPONSE.EXCEPTION_ERROR, null);
    }
  }
}