import { Body, Controller, Headers, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import {
  APP_RESPONSE,
  buildResponse,
} from '../../common/constants/response.constants';
import { GetPushSettingDto } from './dto/get-push-setting.dto';
import { PushSettingsService } from './push-settings.service';
import { SetPushSettingDto } from './dto/set-push-setting.dto';

@Controller('push_settings')
export class PushSettingsController {
  constructor(
    private readonly pushSettingsService: PushSettingsService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization) return null;

    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) return null;

    return token;
  }

  @Post('get_push_setting')
  async getPushSetting(
    @Body() dto: GetPushSettingDto,
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

      const setting = await this.pushSettingsService.findOrCreateByUserId(
        user.id,
      );

      return buildResponse(APP_RESPONSE.OK, {
        like: String(setting.like),
        comment: String(setting.comment),
        transaction: String(setting.transaction),
        announcement: String(setting.announcement),
        sound_on: String(setting.sound_on),
        sound_default: setting.sound_default,
      });
    } catch (error) {
      console.error('getPushSetting error:', error);
      return buildResponse(APP_RESPONSE.EXCEPTION_ERROR, null);
    }
  }

  @Post('set_push_setting')
  async setPushSetting(
    @Body() dto: SetPushSettingDto,
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

      const hasAtLeastOneField =
        dto.like !== undefined ||
        dto.comment !== undefined ||
        dto.transaction !== undefined ||
        dto.announcement !== undefined ||
        dto.sound_on !== undefined ||
        dto.sound_default !== undefined;

      if (!hasAtLeastOneField) {
        return buildResponse(APP_RESPONSE.PARAMETER_NOT_ENOUGH, null);
      }

      await this.pushSettingsService.updatePushSetting(user.id, {
        like: dto.like,
        comment: dto.comment,
        transaction: dto.transaction,
        announcement: dto.announcement,
        sound_on: dto.sound_on,
        sound_default: dto.sound_default,
      });

      return buildResponse(APP_RESPONSE.OK, 'OK');
    } catch (error) {
      console.error('setPushSetting error:', error);
      return buildResponse(APP_RESPONSE.EXCEPTION_ERROR, null);
    }
  }
}