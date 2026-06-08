import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  receiver_name: string;

  @IsString()
  phone: string;

  @IsString()
  full_address: string;

  @IsBoolean()
  is_default: boolean;

  @IsNumber()
  ward_id: number;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  address_name?: string;

  @IsOptional()
  @IsString()
  address_detail?: string;
}