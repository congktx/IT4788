import { Allow } from "class-validator";

export class SetReadNotificationDto {
  @Allow()
  notification_id: number;
}