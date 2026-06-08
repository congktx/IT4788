import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class GetListSavedSearchDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  index: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  count: number;
}