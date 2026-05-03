import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpsertRewardRuleDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsString()
  battle_type: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsNumber()
  reward_coin: number;

  @IsOptional()
  @IsNumber()
  min_confidence?: number;

  @IsOptional()
  @IsNumber()
  max_reward_coin?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
