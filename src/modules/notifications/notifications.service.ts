import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Notification } from "./entities/notification.entity";
import { Repository } from "typeorm";
import { GetNotiticationDto } from "./dto/get-notification.dto";
import { APP_RESPONSE } from "../../common/constants/response.constants";
import { SetReadNotificationDto } from "./dto/set-read-notification.dto";
import { AddNotiDto } from "./dto/add-notification.dto";
import { ConversationsGateway } from "../conversations/conversations.gateway";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,

    private readonly conversationsGateway: ConversationsGateway,
  ) { }

  async getNotification(
    currentUserId: number,
    body: GetNotiticationDto
  ) {
    let skip = body.index * body.count;
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

  async addNotification(
    currentUserId: number,
    body: AddNotiDto
  ) {
    let new_noti = this.notificationRepo.create({
      type: body.type,
      object_id: body.object_id,
      title: body.title,
      user: { id: body.user_id },
      created_at: Math.floor(Date.now() / 1000),
      read: false
    });
    let noti_saved = await this.notificationRepo.save(new_noti);
    if (typeof noti_saved.id === "number") {
      this.conversationsGateway.notifyUser(body.user_id, "new_notification", new_noti);
      return {
        ...APP_RESPONSE.OK,
        data: noti_saved
      }
    } else {
      return {
        ...APP_RESPONSE.CAN_NOT_CONNECT_DB,
        data: null
      }
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
