import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  receiver_name: string;

  @IsString()
  phone: string;

  @IsString()
  full_address: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}