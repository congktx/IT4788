import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Notification } from "./entities/notification.entity";
import { Repository } from "typeorm";
import { GetNotiticationDto } from "./dto/get-notification.dto";
import { APP_RESPONSE } from "../../common/constants/response.constants";
import { SetReadNotificationDto } from "./dto/set-read-notification.dto";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>
  ) { }

  async getNotification(
    currentUserId: number,
    body: GetNotiticationDto
  ) {
    let skip = (body.index - 1) * body.count;
    let [notifications, _] = await this.notificationRepo.findAndCount({
      where: {
        user: { id: currentUserId }
      },
      order: {
        created_at: 'DESC'
      },
      skip: skip,
      take: body.count
    });
    let unread = 0;
    for (let i = 0; i < notifications.length; i++)
      if (!notifications[i].read) unread++;
    return {
      code: APP_RESPONSE.OK.code,
      message: APP_RESPONSE.OK.message,
      data: notifications,
      last_update: Number(Date.now()),
      badge: unread
    }
  }

  async setReadNotification(currentUserId: number, body: SetReadNotificationDto) {
    let result = await this.notificationRepo.update(
      { id: body.notification_id },
      { read: true }
    );
    if (result?.affected === 0) {
      return {
        code: APP_RESPONSE.PARAMETER_VALUE_INVALID.code,
        message: APP_RESPONSE.PARAMETER_VALUE_INVALID.message,
        data: []
      }
    }
    let count = await this.notificationRepo.count({
      where: {
        user: { id: currentUserId },
        read: false
      }
    })
    return {
      code: APP_RESPONSE.OK.code,
      message: APP_RESPONSE.OK.message,
      data: [],
      badge: count
    }
  }
}
