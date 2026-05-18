import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class GetCategoriesDto {
  @ApiPropertyOptional({
    description: '0 là root category, nếu không truyền thì lấy tất cả',
  })
  @IsOptional()
  @IsInt()
  parent_id?: number;
}