import { IsNotEmpty, IsString } from 'class-validator';

export class GetBalanceHistoryDto {
  @IsString()
  @IsNotEmpty()
  index: string;

  @IsString()
  @IsNotEmpty()
  count: string;
}