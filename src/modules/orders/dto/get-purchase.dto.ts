import { IsNotEmpty, IsString } from 'class-validator';

export class GetPurchaseDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}