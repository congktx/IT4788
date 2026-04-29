import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateProductDto } from './create_product.dto';
import { IsString, IsArray, MaxLength, IsOptional } from 'class-validator';
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
}
