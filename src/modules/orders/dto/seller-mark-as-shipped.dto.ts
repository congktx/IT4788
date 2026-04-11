import { IsNotEmpty, IsString } from 'class-validator';

export class SellerMarkAsShippedDto {
  @IsString()
  @IsNotEmpty()
  purchase_id: string;

  @IsString()
  @IsNotEmpty()
  buyer_id: string;
}