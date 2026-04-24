import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddOrderAddress {
  @ApiProperty({
    description: 'địa chỉ chi tiết',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'đánh dấu địa chỉ mặc định',
  })
  @IsBoolean()
  is_default: boolean = false;
  @ApiProperty({
    description: 'mảng các id, 0-ward_id, 1-province_id',
    example: '[1,2]',
  })
  @IsArray()
  @IsOptional()
  address_id: number[];
  @ApiProperty({
    description: 'Vĩ độ',
  })
  @IsNumber()
  lat: number;
  @ApiProperty({
    description: 'Kinh độ',
  })
  @IsNumber()
  lng: number;
}
