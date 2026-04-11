import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BuyerConfirmReceivedDto {
  @IsString()
  @IsNotEmpty()
  purchase_id: string;

  @IsOptional()
  @IsString()
  state?: string;
}