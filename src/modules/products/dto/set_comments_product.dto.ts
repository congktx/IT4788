import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class SetCommentsProductDto {
  @ApiProperty()
  @IsInt()
  product_id: number;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  index: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  count: number;
}