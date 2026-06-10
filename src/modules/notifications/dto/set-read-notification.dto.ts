import { Allow, IsInt, IsNotEmpty, Min } from "class-validator";

export class SetReadNotificationDto {
  @Allow()
  @IsNotEmpty({ message: "1002" })
  @IsInt({ message: "1002" })
  @Min(0, { message: "1002" })
  notification_id: number;
}