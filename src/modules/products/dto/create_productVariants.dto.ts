import { IsString, IsInt, Min, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateProductVariantDto {
  @ApiProperty({
    description: 'variant id (optional when create)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  id?: number;
  @ApiProperty({
    description: 'kích cỡ của mặt hàng',
  })
  @IsString()
  size: string;

  @ApiProperty({
    description: 'số hàng trong kho',
    example: 1,
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
    example: 0.5,
  })
  @IsNumber()
  weight: number;
}
