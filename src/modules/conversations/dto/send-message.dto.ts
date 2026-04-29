import { Allow } from "class-validator";

export class SendMessageDto {
  @Allow()
  to_id: number;

  @Allow()
  message: string;

  // type: text, image, video, file
  @Allow()
  type_message: string;

  @Allow()
  product_id!: number;
}