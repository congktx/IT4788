import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CancelOrderDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsOptional()
  reason?: number;
}