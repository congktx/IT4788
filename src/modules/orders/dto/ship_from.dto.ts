import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';
import * as classTransformer from 'class-transformer';

const Type = (classTransformer as any).Type;
import { ApiProperty } from '@nestjs/swagger';

export class GetShipFromQueryDto {
  @ApiProperty({
    description: 'level mã địa chỉ ',
    required: false,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  level: number = 0;

  @ApiProperty({ example: 0 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  index: number;

  @ApiProperty({ example: 10 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  count: number;

  @ApiProperty({
    description: 'mã tỉnh hoặc mã phường',
    example: '1',
  })
  @IsNotEmpty()
  @IsString()
  parent_id: string;
}
