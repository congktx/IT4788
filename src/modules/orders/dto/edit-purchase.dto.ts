import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EditPurchaseDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  address_id?: string;

  @IsOptional()
  @IsString()
  note?: string;
}