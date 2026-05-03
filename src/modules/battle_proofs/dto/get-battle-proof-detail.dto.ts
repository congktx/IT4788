import { IsInt } from 'class-validator';

export class GetBattleProofDetailDto {
  @IsInt()
  proof_id: number;
}
