import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AddOrderAddressDto {
  @ApiProperty({ description: 'địa chỉ chi tiết' })
  @IsString({ message: '1003' })
  @IsNotEmpty({ message: '1002' })
  address: string;

  @ApiProperty({ description: 'đánh dấu địa chỉ mặc định' })
  @IsBoolean({ message: '1003' })
  is_default: boolean = false;

  @ApiProperty({
    description: 'mảng các id, 0-ward_id, 1-province_id',
    example: '[1,2]',
  })
  @IsArray({ message: '1003' })
  @IsNotEmpty({ message: '1002' })
  address_id: number[];

  @ApiProperty({ description: 'Vĩ độ' })
  @IsNumber({}, { message: '1003' })
  @IsNotEmpty({ message: '1002' })
  lat: number;

  @ApiProperty({ description: 'Kinh độ' })
  @IsNumber({}, { message: '1003' })
  @IsNotEmpty({ message: '1002' })
  lng: number;

  @ApiProperty({ description: 'Họ và tên người nhận' })
  @IsString({ message: '1003' })
  @IsNotEmpty({ message: '1002' })
  receiver_name: string;

  @ApiProperty({ description: 'Số điện thoại' })
  @IsString({ message: '1003' })
  @IsNotEmpty({ message: '1002' })
  phone: string;

  @ApiProperty({ description: 'cả địa chỉ' })
  @IsString({ message: '1003' })
  @IsNotEmpty({ message: '1002' })
  full_address: string;

  @ApiProperty({ description: 'address detail' })
  @IsString({ message: '1003' })
  @IsNotEmpty({ message: '1002' })
  address_detail: string;
}
