import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SetRateDto {
  @ApiProperty()
  @IsInt()
  user_id: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  level: number;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  product_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  purchase_id?: number;
}