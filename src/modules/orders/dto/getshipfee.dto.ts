import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetShipFeeDto {
  @ApiProperty({
    description: 'mã sản phẩm',
  })
  @IsNumber()
  @IsNotEmpty()
  product_id: number;

  @ApiProperty({
    description: 'Mã địa chỉ người dùng',
  })
  @IsNumber()
  @IsOptional()
  address_id: number;
}
