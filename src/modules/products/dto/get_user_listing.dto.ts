import { IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetUserListingsDto {
  @ApiProperty({
    description: 'index',
  })
  @IsNumber()
  index: number;

  @ApiProperty({
    description: 'count',
  })
  @IsNumber()
  count: number;

  @ApiProperty({
    description: 'user_id',
  })
  @IsNumber()
  @IsOptional()
  user_id: number;

  @ApiProperty({
    description: 'Từ khóa tìm kiếm',
  })
  @IsString()
  @IsOptional()
  keyword: string;

  @ApiProperty({
    description: 'thuộc tính sản phẩm',
  })
  @IsOptional()
  @IsNumber()
  category_id: number;
}
