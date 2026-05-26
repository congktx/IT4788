import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class AddOrderAddress {
  @ApiProperty({ description: 'địa chỉ chi tiết' })
  @IsDefined({ message: '1002' })
  @IsString({ message: '1003' })
  address: string;

  @ApiProperty({
    description: 'đánh dấu địa chỉ mặc định',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: '1003' })
  is_default?: boolean = false;

  @ApiProperty({
    description: 'mảng các id, 0-ward_id, 1-province_id',
    example: [1, 2],
  })
  @IsDefined({ message: '1002' })
  @IsArray({ message: '1003' })
  @ArrayMinSize(2, { message: '1004' })
  @IsNumber({}, { each: true, message: '1003' })
  address_id: number[];

  @ApiProperty({ description: 'Vĩ độ' })
  @IsDefined({ message: '1002' })
  @IsNumber({}, { message: '1003' })
  lat: number;

  @ApiProperty({ description: 'Kinh độ' })
  @IsDefined({ message: '1002' })
  @IsNumber({}, { message: '1003' })
  lng: number;

  @ApiProperty({ description: 'Họ và tên người nhận' })
  @IsDefined({ message: '1002' })
  @IsString({ message: '1003' })
  receiver_name: string;

  @ApiProperty({ description: 'Số điện thoại' })
  @IsDefined({ message: '1002' })
  @IsString({ message: '1003' })
  phone: string;

  @ApiProperty({ description: 'cả địa chỉ' })
  @IsDefined({ message: '1002' })
  @IsString({ message: '1003' })
  full_address: string;

  @ApiProperty({ description: 'address detail' })
  @IsDefined({ message: '1002' })
  @IsString({ message: '1003' })
  address_detail: string;
}