import { Allow, IsInt } from "class-validator";

export class GetRewardProofDto {
  @Allow()
  @IsInt({ message: "1002" })
  reward_id: number;
}