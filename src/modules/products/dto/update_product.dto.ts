import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateProductDto } from './create_product.dto';
import {
  IsString,
  IsArray,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import * as classTransformer from 'class-transformer';
const Type = (classTransformer as any).Type;
export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiProperty({
    description: 'delete product image url',
    example: 'https://...',
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  image_urls_del?: string[];

  @ApiProperty({
    description: 'price_discount',
    example: 100000.2,
    minimum: 0,
  })
  @IsNumber({}, { message: '1003' })
  @Min(0, { message: '1004' })
  @IsOptional()
  @Type(() => Number)
  price_discount: number;
}
