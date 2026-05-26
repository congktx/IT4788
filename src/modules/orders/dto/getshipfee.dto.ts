import { IsDefined, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetShipFeeDto {
  @ApiProperty({ description: 'Mã sản phẩm' })
  @IsDefined({ message: '1002' })
  @IsNumber({}, { message: '1003' })
  product_id: number;

  @ApiPropertyOptional({ description: 'Mã địa chỉ người dùng' })
  @IsOptional()
  @IsNumber({}, { message: '1003' })
  address_id?: number;
}