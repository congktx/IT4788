import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetListBattleProofsDto {
  @IsString()
  @IsNotEmpty()
  index: string;

  @IsString()
  @IsNotEmpty()
  count: string;

  @IsOptional()
  @IsString()
  status?: string;
}
