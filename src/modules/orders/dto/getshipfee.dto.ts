import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetShipFeeDto {
  @ApiProperty({
    description: 'mã sản phẩm',
  })
  @IsNumber({}, { message: '1003' })
  @IsNotEmpty({ message: '1002' })
  product_id: number;

  @ApiProperty({
    description: 'Mã địa chỉ người dùng',
  })
  @IsNumber({}, { message: '1003' })
  @IsOptional()
  address_id: number;
}
