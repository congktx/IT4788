import { Allow } from "class-validator";

export class CreateRewardAppealDto {
  @Allow()
  reward_id: number;

  @Allow()
  reason: string;
}