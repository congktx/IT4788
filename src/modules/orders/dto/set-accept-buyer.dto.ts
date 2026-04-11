import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class SetAcceptBuyerDto {
  @IsString()
  @IsNotEmpty()
  purchase_id: string;

  @IsString()
  @IsNotEmpty()
  buyer_id: string;

  @IsInt()
  is_accept: number;
}