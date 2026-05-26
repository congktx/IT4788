import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class DelSavedSearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Nếu search_id = 0 thì xóa toàn bộ lịch sử tìm kiếm',
  })
  @IsOptional()
  @IsInt()
  search_id?: number;
}