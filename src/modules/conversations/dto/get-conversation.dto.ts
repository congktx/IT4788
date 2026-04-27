import { Allow } from "class-validator";

export class GetConvDto {
  @Allow()
  partner_id!: number;

  @Allow()
  conversation_id!: number;

  @Allow()
  index: number;

  @Allow()
  count: number;
}