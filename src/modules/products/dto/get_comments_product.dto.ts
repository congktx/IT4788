import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class GetCommentsProductDto {
  @ApiProperty()
  @IsInt()
  product_id: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  index: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  count: number;
}