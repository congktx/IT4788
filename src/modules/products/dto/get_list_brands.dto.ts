import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class GetListBrandsDto {
  @ApiPropertyOptional({
    description: '0 hoặc null => lấy tất cả',
  })
  @IsOptional()
  @IsInt()
  category_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  index?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number = 10;
}