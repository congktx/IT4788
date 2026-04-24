import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetListNewsDto {
  @ApiProperty({
    description: 'index để hiển thị từ trang',
  })
  @IsNumber()
  index: number;
  @ApiProperty({
    description: 'Số trang ',
  })
  @IsNumber()
  count: number;
}
