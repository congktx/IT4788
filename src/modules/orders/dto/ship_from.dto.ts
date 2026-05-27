import {
  IsDefined,
  IsOptional,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import * as classTransformer from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const Type = (classTransformer as any).Type;

export class GetShipFromQueryDto {
  @ApiProperty({
    description: 'level mã địa chỉ',
    required: false,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '1003' })
  level: number = 0;

  @ApiProperty({ example: 0 })
  @IsDefined({ message: '1002' })
  @Type(() => Number)
  @IsNumber({}, { message: '1003' })
  @Min(0, { message: '1004' })
  index: number;

  @ApiProperty({ example: 10 })
  @IsDefined({ message: '1002' })
  @Type(() => Number)
  @IsNumber({}, { message: '1003' })
  @Min(1, { message: '1004' })
  count: number;

  @ApiProperty({
    description: 'mã tỉnh hoặc mã phường',
    example: '1',
  })
  @IsDefined({ message: '1002' })
  @IsString({ message: '1003' })
  parent_id: string;
}