import { Allow } from "class-validator";

export class SetReadMessageDto {
  @Allow()
  partner_id: number;
}