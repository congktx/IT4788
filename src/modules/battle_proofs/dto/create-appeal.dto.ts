import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAppealDto {
  @IsInt()
  proof_id: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  requested_coin?: number;
}
