import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { APP_RESPONSE } from 'src/common/constants/response.constants';
import { AuthGuard } from 'src/common/auth/guards/auth.guard';
import type { AuthenticatedRequest } from 'src/types/auth.type';
import { GetNotiticationDto } from './dto/get-notification.dto';
import { SetReadNotificationDto } from './dto/set-read-notification.dto';

@Controller('notification')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('get_notification')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async get_notification(
    @Req() req: AuthenticatedRequest,
    @Body() body: GetNotiticationDto,
  ) {
    try {
      const currentUserId = Number(
        req.user?.id ?? req.user?.userId ?? req.user?.sub,
      );

      return await this.notificationsService.getNotification(
        currentUserId,
        body,
      );
    } catch (err: any) {
      return {
        code: APP_RESPONSE.UNKNOWN_ERROR.code,
        message: APP_RESPONSE.UNKNOWN_ERROR.message,
        data: err.to_string(),
      };
    }
  }

  @Post('set_read_notification')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async set_read_notification(
    @Req() req: AuthenticatedRequest,
    @Body() body: SetReadNotificationDto,
  ) {
    try {
      const currentUserId = Number(
        req.user?.id ?? req.user?.userId ?? req.user?.sub,
      );

      return await this.notificationsService.setReadNotification(
        currentUserId,
        body,
      );
    } catch (err: any) {
      return {
        code: APP_RESPONSE.UNKNOWN_ERROR.code,
        message: APP_RESPONSE.UNKNOWN_ERROR.message,
        data: err.to_string(),
      };
    }
  }
}
