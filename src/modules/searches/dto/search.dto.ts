import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  category_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  brand_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  price_min?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  price_max?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  index: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  count: number;
}