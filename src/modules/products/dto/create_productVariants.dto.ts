import { IsString, IsInt, Min, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateProductVariantDto {
  @ApiProperty({
    description: 'kích cỡ của mặt hàng',
  })
  @IsString()
  size: string;

  @ApiProperty({
    description: 'số hàng trong kho',
  })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({
    description: 'Màu sắc',
  })
  @IsString()
  color: string;

  @ApiProperty({
    description: 'Khối lượng',
  })
  @IsNumber()
  weight: number;
}
