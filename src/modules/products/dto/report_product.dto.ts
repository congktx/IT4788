import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class ReportProductDto {
  @ApiProperty()
  @IsInt()
  product_id: number;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsString()
  details: string;
}