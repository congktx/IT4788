import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AddOrderAddressDto {
  @ApiProperty({ description: 'địa chỉ chi tiết' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'đánh dấu địa chỉ mặc định' })
  @IsBoolean()
  is_default: boolean = false;

  @ApiProperty({
    description: 'mảng các id, 0-ward_id, 1-province_id',
    example: '[1,2]',
  })
  @IsArray()
  @IsOptional()
  address_id: number[];

  @ApiProperty({ description: 'Vĩ độ' })
  @IsNumber()
  lat: number;

  @ApiProperty({ description: 'Kinh độ' })
  @IsNumber()
  lng: number;

  @ApiProperty({ description: 'Họ và tên người nhận' })
  @IsString()
  receiver_name: string;

  @ApiProperty({ description: 'Số điện thoại' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'cả địa chỉ' })
  @IsString()
  full_address: string;

  @ApiProperty({ description: 'address detail' })
  @IsString()
  address_detail: string;
}
