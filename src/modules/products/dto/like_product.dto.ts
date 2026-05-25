import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class LikeProductDto {
  @ApiProperty()
  @IsInt()
  product_id: number;
}