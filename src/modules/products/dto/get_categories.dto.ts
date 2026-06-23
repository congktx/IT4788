import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class GetCategoriesDto {
  @ApiPropertyOptional({
    description: '0 là root category, nếu không truyền thì lấy tất cả',
  })
  @IsOptional()
  @IsInt()
  parent_id?: number;

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