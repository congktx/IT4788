import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetRatesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  user_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  product_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  purchase_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  level?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  index: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  count: number;
}