import { IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetListNewsDto {
  @ApiProperty({
    description: 'index để hiển thị từ trang',
  })
  @IsNumber()
  @IsOptional()
  index: number;
  @ApiProperty({
    description: 'Số trang ',
  })
  @IsNumber()
  @IsOptional()
  count: number;
}
