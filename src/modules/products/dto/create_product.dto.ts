import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsNotEmpty,
  MaxLength,
  Min,
  ValidateNested,
  IsUrl,
  IsOptional,
} from 'class-validator';
import * as classTransformer from 'class-transformer';
import { CreateProductVariantDto } from './create_productVariants.dto';
const Type = (classTransformer as any).Type;
export class VideoDto {
  @IsUrl({}, { message: 'Đường dẫn vieo không hợp lệ' })
  @IsString()
  url: string;

  @IsString()
  @IsOptional()
  thumb: string;
}
export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Name',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'price',
    example: 100000.2,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({
    description: 'price_discount',
    example: 100000.2,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price_discount: number;

  @ApiProperty({
    description: 'Product description',
    example: 'description',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Product image url',
    example: 'https://...',
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  image_urls?: string[];

  @ApiProperty({
    description: 'ID of the brand',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  brand_id: number;

  @ApiProperty({
    type: [CreateProductVariantDto],
    description: 'Product variants',
  })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];

  @ApiProperty({
    description: 'category',
  })
  @IsNumber()
  @IsOptional()
  category_id: number;

  @ApiProperty({
    description: 'ID of the shipping address (Warehouse)',
    example: 5,
  })
  @IsNotEmpty()
  @IsNumber()
  ship_from_id: number;
  @ApiProperty({
    description: 'Đường link video và thumb',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VideoDto)
  videos: VideoDto[];
}
