import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class GetProductsDto {
  @ApiProperty()
  @IsInt()
  id: number;
}