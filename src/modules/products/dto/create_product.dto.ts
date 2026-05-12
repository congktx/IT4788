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
  @ApiProperty({
    description: 'https://example.com/video.mp4',
    example: 'https://example.com/video.mp4',
  })
  @IsUrl()
  @IsString()
  @IsOptional()
  url: string;

  @ApiProperty({
    description: 'https://example.com/image2.mp4',
    example: 'https://example.com/video.mp4',
  })
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
  @IsString({ message: '1003' })
  @IsNotEmpty({ message: '1002' })
  @MaxLength(255, { message: '1004' })
  title: string;

  @ApiProperty({
    description: 'price',
    example: 100000.2,
    minimum: 0,
  })
  @IsNotEmpty({ message: '1002' })
  @IsNumber({}, { message: '1003' })
  @Min(0, { message: '1004' })
  @Type(() => Number)
  price: number;

  @ApiProperty({
    description: 'Product description',
    example: 'description',
  })
  @IsString({ message: '1003' })
  @IsNotEmpty({ message: '1002' })
  description: string;

  @ApiProperty({
    description: 'Product image url',
    example: 'https://example.com/image.mp4',
    required: false,
  })
  @IsArray({ message: '1003' })
  @IsOptional()
  @IsString({ each: true, message: '1003' })
  @MaxLength(255, { each: true, message: '1004' })
  image_urls?: string[];

  @ApiProperty({
    description: 'ID of the brand',
    example: 1,
  })
  @IsNumber({}, { message: '1003' })
  @IsOptional()
  brand_id: number;

  @ApiProperty({
    type: [CreateProductVariantDto],
    description: 'Product variants',
  })
  @IsArray({ message: '1003' })
  @IsNotEmpty({ message: '1002' })
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];

  @ApiProperty({
    description: 'category',
    example: 1,
  })
  @IsNumber({}, { message: '1003' })
  @IsOptional()
  category_id: number;

  @ApiProperty({
    description: 'ID of the shipping address (Warehouse)',
    example: 5,
  })
  @IsNotEmpty({ message: '1002' })
  @IsNumber({}, { message: '1003' })
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
