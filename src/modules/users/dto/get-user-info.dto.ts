import { Allow } from "class-validator";

export class GetUserInfoDto {
  @Allow()
  user_id!: number;
}